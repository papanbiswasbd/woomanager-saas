'use client';

import { useSettingsStore } from '@/lib/store';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Link as LinkIcon, Unlink, KeyRound, Printer, Save, Image as ImageIcon } from 'lucide-react';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const settings = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [storeUrlInput, setStoreUrlInput] = useState('');
  
  const [showManual, setShowManual] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{status: 'idle' | 'success' | 'error', message: string}>({status: 'idle', message: ''});
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [shopName, setShopName] = useState(settings.shopName || '');
  const [shopLogoUrl, setShopLogoUrl] = useState(settings.shopLogoUrl || '');
  const [shopAddress, setShopAddress] = useState(settings.shopAddress || '');
  const [shopPhone, setShopPhone] = useState(settings.shopPhone || '');
  const [invoiceFooterText, setInvoiceFooterText] = useState(settings.invoiceFooterText || '');
  const [isBrandingSaved, setIsBrandingSaved] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    fetch('/api/store')
      .then(res => res.json())
      .then(data => {
        if (data && data.url) {
          settings.setSettings({
            storeUrl: data.url,
            consumerKey: data.consumerKey || '',
            consumerSecret: data.consumerSecret || ''
          });
          setStoreUrlInput(data.url);
        }
        setMounted(true);
      })
      .catch(err => {
        console.error("Failed to load store settings", err);
        setMounted(true);
      });
  }, []);

  useEffect(() => {
    // Check if we just returned from WooCommerce Auth
    const success = searchParams.get('success');
    
    if (success === '1') {
      setIsAuthenticating(true);
      
      // Wait a tiny bit for the DB write to finish if it just happened
      setTimeout(() => {
        fetch(`/api/store`)
          .then(res => res.json())
          .then(data => {
            if (data.consumerKey && data.consumerSecret) {
              const finalUrl = data.url || window.localStorage.getItem('tempStoreUrl') || '';
              
              if (!data.url && finalUrl) {
                fetch('/api/store', {
                  method: 'POST',
                  body: JSON.stringify({ url: finalUrl, consumerKey: data.consumerKey, consumerSecret: data.consumerSecret })
                });
              }

              settings.setSettings({
                storeUrl: finalUrl,
                consumerKey: data.consumerKey,
                consumerSecret: data.consumerSecret
              });
              
              window.localStorage.removeItem('tempStoreUrl');
              setConnectionStatus({ status: 'success', message: 'Successfully connected to WooCommerce!' });
              router.replace('/settings');
            } else {
              setConnectionStatus({ status: 'error', message: 'Failed to retrieve keys from database callback.' });
            }
          })
          .catch(err => {
            setConnectionStatus({ status: 'error', message: err.message });
          })
          .finally(() => {
            setIsAuthenticating(false);
          });
      }, 1000);
    }
  }, [searchParams, router]);

  const handleConnect = async () => {
    if (!storeUrlInput) {
      alert("Please enter your WooCommerce Store URL first.");
      return;
    }

    try {
      const url = new URL(storeUrlInput.startsWith('http') ? storeUrlInput : `https://${storeUrlInput}`);
      const cleanUrl = url.origin;
      
      if (!window.location.origin.startsWith('https://')) {
        alert("WooCommerce Auto-Integration requires your application to run on HTTPS. Since you are running locally on HTTP, please use the Manual Connection method below.");
        setShowManual(true);
        return;
      }

      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          consumerKey: '',
          consumerSecret: ''
        })
      });

      settings.setSettings({
        storeUrl: cleanUrl,
        consumerKey: '',
        consumerSecret: ''
      });

      window.localStorage.setItem('tempStoreUrl', cleanUrl);

      const appName = encodeURIComponent("WooOrder Management SaaS");
      const scope = "read_write";
      const userId = Math.random().toString(36).substring(7); // Random unique ID
      const returnUrl = encodeURIComponent(`${window.location.origin}/settings`);
      const callbackUrl = encodeURIComponent(`${window.location.origin}/api/auth/woo/callback`);

      const authUrl = `${cleanUrl}/wc-auth/v1/authorize?app_name=${appName}&scope=${scope}&user_id=${userId}&return_url=${returnUrl}&callback_url=${callbackUrl}`;
      
      window.location.href = authUrl;
    } catch (e) {
      alert("Invalid Store URL format. Please enter a valid URL like https://mystore.com");
    }
  };

  const handleManualConnect = async () => {
    if (!storeUrlInput || !manualKey || !manualSecret) {
      alert("Please enter Store URL, Consumer Key, and Consumer Secret.");
      return;
    }

    try {
      const url = new URL(storeUrlInput.startsWith('http') ? storeUrlInput : `https://${storeUrlInput}`);
      const cleanUrl = url.origin;

      setIsChecking(true);
      setConnectionStatus({ status: 'idle', message: '' });

      // Save to DB
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          consumerKey: manualKey,
          consumerSecret: manualSecret
        })
      });

      settings.setSettings({
        storeUrl: cleanUrl,
        consumerKey: manualKey,
        consumerSecret: manualSecret
      });

      setConnectionStatus({ status: 'success', message: 'Keys saved successfully! Please click Check Connection to verify.' });
      setShowManual(false);
      setManualKey('');
      setManualSecret('');
    } catch (e) {
      alert("Invalid Store URL format.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect? This will remove your API keys.")) {
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: '',
          consumerKey: '',
          consumerSecret: ''
        })
      });

      settings.setSettings({
        storeUrl: '',
        consumerKey: '',
        consumerSecret: ''
      });
      setStoreUrlInput('');
      setConnectionStatus({ status: 'idle', message: '' });
    }
  };

  const handleCheckConnection = async () => {
    if (!settings.storeUrl || !settings.consumerKey || !settings.consumerSecret) {
      setConnectionStatus({ status: 'error', message: 'Not connected. Please connect first.' });
      return;
    }

    setIsChecking(true);
    setConnectionStatus({ status: 'idle', message: '' });

    try {
      const res = await fetch('/api/woo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: settings.storeUrl,
          consumerKey: settings.consumerKey,
          consumerSecret: settings.consumerSecret
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setConnectionStatus({ status: 'success', message: `Successfully connected to: ${data.environment}` });
      } else {
        setConnectionStatus({ status: 'error', message: data.message || 'Connection failed' });
      }
    } catch (err: any) {
      setConnectionStatus({ status: 'error', message: err.message });
    } finally {
      setIsChecking(false);
    }
  };

  if (!mounted) return null;

  const isConnected = !!settings.consumerKey && !!settings.consumerSecret;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Connection Settings</h1>

      <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
        
        {isAuthenticating && (
          <div className="p-4 bg-primary/10 text-primary rounded-md flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="font-medium">Finalizing connection...</p>
          </div>
        )}

        {connectionStatus.status !== 'idle' && !isAuthenticating && (
          <div className={`p-4 rounded-md flex items-start gap-3 ${
            connectionStatus.status === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
          }`}>
            {connectionStatus.status === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
            <p className="font-medium text-sm leading-tight">{connectionStatus.message}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">WooCommerce Store URL</label>
            <input
              type="url"
              value={isConnected ? settings.storeUrl : storeUrlInput}
              onChange={(e) => setStoreUrlInput(e.target.value)}
              placeholder="https://mystore.com"
              disabled={isConnected}
              className="w-full h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div className="pt-4 flex items-center gap-3 border-t">
            {!isConnected ? (
              <>
                <button
                  onClick={handleConnect}
                  disabled={!storeUrlInput || isAuthenticating}
                  className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  <LinkIcon className="h-4 w-4" />
                  Auto Connect
                </button>
                <button
                  onClick={() => setShowManual(!showManual)}
                  disabled={isAuthenticating}
                  className="h-10 px-4 py-2 border hover:bg-muted inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  Manual Entry
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCheckConnection}
                  disabled={isChecking}
                  className="h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Check Connection
                </button>
                <button
                  onClick={handleDisconnect}
                  className="h-10 px-4 py-2 border hover:bg-destructive/10 text-destructive inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </button>
              </>
            )}
          </div>

          {/* Manual Entry Form */}
          {showManual && !isConnected && (
            <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="p-3 bg-amber-500/10 text-amber-700 dark:text-amber-500 text-sm rounded-md">
                <strong>Local Development Note:</strong> WooCommerce requires Auto-Connect to run on HTTPS. Since you are running locally (HTTP), please manually generate REST API keys in your WordPress Admin (WooCommerce {'>'} Settings {'>'} Advanced {'>'} REST API) and paste them here.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Consumer Key</label>
                  <input
                    type="password"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    placeholder="ck_..."
                    className="w-full h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Consumer Secret</label>
                  <input
                    type="password"
                    value={manualSecret}
                    onChange={(e) => setManualSecret(e.target.value)}
                    placeholder="cs_..."
                    className="w-full h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <button
                onClick={handleManualConnect}
                disabled={isChecking || !manualKey || !manualSecret || !storeUrlInput}
                className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isChecking ? 'Saving...' : 'Save Keys Manually'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Webhooks Section */}
      {isConnected && (
        <div className="bg-card border rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-medium">Real-Time Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Register webhooks in your WooCommerce store so that any changes (new orders, products, or customers) are instantly pushed to this application without needing to sync manually.
          </p>
          <button
            onClick={async () => {
              try {
                setIsChecking(true);
                const res = await fetch('/api/webhooks/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    baseUrl: window.location.origin,
                    storeUrl: settings.storeUrl,
                    consumerKey: settings.consumerKey,
                    consumerSecret: settings.consumerSecret
                  })
                });
                const data = await res.json();
                if (res.ok) {
                  settings.setSettings({ webhooksRegistered: true });
                  alert("Webhooks registered successfully!");
                } else {
                  alert(`Failed: ${data.message || data.results?.map((r: any) => `${r.topic}: ${r.error}`).join(', ')}`);
                }
              } catch (e: any) {
                alert(`Error: ${e.message}`);
              } finally {
                setIsChecking(false);
              }
            }}
            disabled={isChecking || settings.webhooksRegistered}
            className={`h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 ${
              settings.webhooksRegistered 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 hover:bg-green-500/10'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (settings.webhooksRegistered ? <CheckCircle2 className="h-4 w-4 mr-2" /> : null)}
            {settings.webhooksRegistered ? 'Webhooks Connected' : 'Auto-Register Webhooks'}
          </button>
        </div>
      )}

      {/* Invoice & Label Branding Settings */}
      <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Invoice & Label Branding
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customize the shop details, logo, address, and footer notes printed on invoices and 58mm thermal labels.
            </p>
          </div>
        </div>

        {isBrandingSaved && (
          <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Branding settings saved successfully!
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="My Store Name"
                className="w-full h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shop Phone Number</label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Shop Logo URL</span>
              {shopLogoUrl && <span className="text-xs text-muted-foreground">Preview Active</span>}
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="url"
                value={shopLogoUrl}
                onChange={(e) => setShopLogoUrl(e.target.value)}
                placeholder="https://example.com/uploads/logo.png"
                className="flex-1 h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              {shopLogoUrl ? (
                <img src={shopLogoUrl} alt="Store Logo Preview" className="h-10 w-10 object-contain border rounded-md p-1 bg-white shrink-0 shadow-xs" onError={() => {}} />
              ) : (
                <div className="h-10 w-10 border rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Shop Business Address</label>
            <textarea
              rows={3}
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              placeholder="123 Business Street, Suite 400&#10;City, State, Zip Code"
              className="w-full p-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Footer Notes / Terms</label>
            <input
              type="text"
              value={invoiceFooterText}
              onChange={(e) => setInvoiceFooterText(e.target.value)}
              placeholder="Thank you for your business! Terms & Conditions apply."
              className="w-full h-10 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                settings.setSettings({
                  shopName,
                  shopLogoUrl,
                  shopAddress,
                  shopPhone,
                  invoiceFooterText
                });
                setIsBrandingSaved(true);
                setTimeout(() => setIsBrandingSaved(false), 3000);
              }}
              className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Invoice Branding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

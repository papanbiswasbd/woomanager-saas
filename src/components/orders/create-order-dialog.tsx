'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';
import { useProducts } from '@/hooks/use-products';
import { useOrderStatuses } from '@/hooks/use-order-statuses';
import { useShippingMethods } from '@/hooks/use-shipping-methods';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, ShoppingBag, User, MapPin, CheckCircle2, AlertCircle, Truck } from 'lucide-react';

interface CreateOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LineItemDraft {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export function CreateOrderDialog({ isOpen, onClose }: CreateOrderDialogProps) {
  const queryClient = useQueryClient();
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const { data: productsData, isLoading: isProductsLoading } = useProducts(1, 100);
  const { data: statusesData } = useOrderStatuses();
  const { data: shippingMethodsData, isLoading: isShippingLoading } = useShippingMethods();

  const products = productsData?.products || [];
  const baseStatuses = statusesData || [];
  const shippingMethods = shippingMethodsData || [];

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  
  const [status, setStatus] = useState('processing');
  const [paymentMethodTitle, setPaymentMethodTitle] = useState('Cash on Delivery');
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState('flat_rate');
  const [shippingCost, setShippingCost] = useState('0.00');
  const [customerNote, setCustomerNote] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update default selected shipping method when data loads
  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedShippingMethodId) {
      setSelectedShippingMethodId(shippingMethods[0].id);
    }
  }, [shippingMethods, selectedShippingMethodId]);

  // Handle adding product to order
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const prodId = parseInt(selectedProductId);
    const prod = products.find((p: any) => p.id === prodId);
    if (!prod) return;

    // Check if already in line items
    const existingIndex = lineItems.findIndex(i => i.product_id === prodId);
    if (existingIndex > -1) {
      setLineItems(prev => prev.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      let imageSrc = '';
      try {
        const parsedImages = JSON.parse(prod.images || '[]');
        if (parsedImages.length > 0) imageSrc = parsedImages[0].src;
      } catch (e) {}

      setLineItems(prev => [
        ...prev,
        {
          product_id: prod.id,
          name: prod.name,
          price: parseFloat(prod.price || '0'),
          quantity: 1,
          image: imageSrc
        }
      ]);
    }

    setSelectedProductId('');
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setLineItems(prev => prev.map((item, idx) => 
      idx === index ? { ...item, quantity } : item
    ));
  };

  const itemsTotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const parsedShippingCost = parseFloat(shippingCost) || 0;
  const grandTotal = itemsTotal + parsedShippingCost;

  const resetForm = () => {
    setLineItems([]);
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setAddress1('');
    setCity('');
    setStatus('processing');
    setPaymentMethodTitle('Cash on Delivery');
    setSelectedShippingMethodId(shippingMethods[0]?.id || 'flat_rate');
    setShippingCost('0.00');
    setCustomerNote('');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (lineItems.length === 0) {
      setErrorMessage("Please add at least one product to the order.");
      return;
    }
    if (!firstName.trim() && !lastName.trim()) {
      setErrorMessage("Customer First Name or Last Name is required.");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Customer Phone Number is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const billingPayload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        address_1: address1.trim(),
        city: city.trim(),
      };
      if (email.trim()) {
        billingPayload.email = email.trim();
      }

      const shippingPayload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        address_1: address1.trim(),
        city: city.trim(),
      };

      const chosenShipping = shippingMethods.find(m => m.id === selectedShippingMethodId) || {
        id: selectedShippingMethodId || 'flat_rate',
        title: 'Flat Rate'
      };

      const payload = {
        payment_method: "cod",
        payment_method_title: paymentMethodTitle || "Cash on Delivery",
        status: status || "processing",
        billing: billingPayload,
        shipping: shippingPayload,
        line_items: lineItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        shipping_lines: [
          {
            method_id: chosenShipping.id,
            method_title: chosenShipping.title,
            total: String(parsedShippingCost.toFixed(2))
          }
        ],
        customer_note: customerNote.trim()
      };

      const res = await fetch('/api/woo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'orders',
          method: 'POST',
          data: payload,
          url: storeUrl,
          consumerKey,
          consumerSecret
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create order on WooCommerce.");
      }

      // Success! Invalidate React Query cache to refresh orders page
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Create Order Error:", err);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-white dark:bg-card sticky top-0 z-10">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Create New Order
          </DialogTitle>
          <DialogDescription>
            Manually create a new order and sync it directly to your WooCommerce store.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 text-red-700 dark:text-red-400 rounded-md flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Product Selection Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              Order Items
            </h3>

            <div className="flex gap-2">
              <select
                className="flex-1 h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-1 focus:ring-ring capitalize cursor-pointer"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={isProductsLoading || isSubmitting}
              >
                <option value="">-- Select Product from Store --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price ? `$${p.price}` : 'Free'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductId || isSubmitting}
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            {/* Added Items List */}
            {lineItems.length > 0 ? (
              <div className="border rounded-md divide-y bg-gray-50/50 dark:bg-muted/20">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-10 w-10 rounded border bg-white object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 border rounded bg-background px-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                          className="px-2 py-0.5 text-sm hover:bg-muted rounded"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium px-2">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                          className="px-2 py-0.5 text-sm hover:bg-muted rounded"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold w-16 text-right">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-card flex flex-col gap-1 border-t text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items Subtotal</span>
                    <span>${itemsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping Fee</span>
                    <span>${parsedShippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t text-foreground">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">No products added yet. Select a product above to add.</p>
            )}
          </div>

          {/* Customer Details Section */}
          <div className="space-y-3 pt-3 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer & Billing Details
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0192"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium">Street Address</label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="123 Main St"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Shipping & Order Settings Section */}
          <div className="space-y-3 pt-3 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Shipping & Order Configuration
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-1">
                  Shipping Method (Dynamic WooCommerce)
                </label>
                <select
                  value={selectedShippingMethodId}
                  onChange={(e) => setSelectedShippingMethodId(e.target.value)}
                  disabled={isShippingLoading}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm outline-none focus:ring-1 focus:ring-ring capitalize cursor-pointer"
                >
                  {shippingMethods.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Shipping Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-medium">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm outline-none focus:ring-1 focus:ring-ring capitalize cursor-pointer"
                >
                  {baseStatuses.filter((s: any) => s.value !== 'any').map((s: any) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Payment Method</label>
                <input
                  type="text"
                  value={paymentMethodTitle}
                  onChange={(e) => setPaymentMethodTitle(e.target.value)}
                  placeholder="Cash on Delivery"
                  className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Customer Note (Optional)</label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Special instructions for delivery..."
                className="w-full p-2.5 rounded-md border bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 border rounded-md text-sm font-medium hover:bg-muted cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Order (${grandTotal.toFixed(2)})
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

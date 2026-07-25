import { format, formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';
import { useOrderStatuses } from '@/hooks/use-order-statuses';
import { useOrderNotes } from '@/hooks/use-order-notes';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MapPin, User, Mail, Phone, CreditCard, Package, Calendar, MoreHorizontal, Copy, Edit2, Loader2, Check, X, Printer, Tag, MessageSquare, ExternalLink } from 'lucide-react';
import { printOrderInvoice } from '@/lib/print-invoice';
import { printOrderLabel } from '@/lib/print-label';

interface OrderDetailsDrawerProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsDrawer({ order: incomingOrder, isOpen, onClose }: OrderDetailsDrawerProps) {
  const [activeOrder, setActiveOrder] = useState<any>(null);

  useEffect(() => {
    if (incomingOrder) {
      setActiveOrder(incomingOrder);
    }
  }, [incomingOrder]);

  const order = incomingOrder || activeOrder;

  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  
  const [billingForm, setBillingForm] = useState<any>({});
  const [shippingForm, setShippingForm] = useState<any>({});
  const [newAdminNote, setNewAdminNote] = useState('');

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemPrice, setEditingItemPrice] = useState('');
  
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  
  const queryClient = useQueryClient();
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const { data: statuses } = useOrderStatuses();
  const { notes: orderNotes, isLoading: isNotesLoading, addNote, isAddingNote } = useOrderNotes(order?.id);

  const updateOrderMutation = useMutation({
    mutationFn: async (updateData: any) => {
      if (!order) throw new Error('No active order');
      const response = await fetch('/api/woo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `orders/${order.id}`,
          method: 'PUT',
          data: updateData,
          url: storeUrl,
          consumerKey,
          consumerSecret
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = data.message || 'Error updating order via proxy';
        if (data.details?.params) {
          errorMsg += '\nDetails: ' + JSON.stringify(data.details.params);
        }
        throw new Error(errorMsg);
      }
      return data;
    },
    onMutate: async (updateData: any) => {
      if (!order) return;
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['orders'] });

      queryClient.setQueriesData({ queryKey: ['orders'] }, (old: any) => {
        if (!old || !old.orders) return old;
        return {
          ...old,
          orders: old.orders.map((o: any) => {
            if (o.id === order.id) {
              const updatedOrder = { ...o, ...updateData };
              if (updateData.line_items) {
                updatedOrder.line_items = o.line_items.map((item: any) => {
                  const updateItem = updateData.line_items.find((i: any) => i.id === item.id);
                  return updateItem ? { ...item, ...updateItem } : item;
                });
              }
              if (updateData.fee_lines) {
                updatedOrder.fee_lines = [...(o.fee_lines || []), ...updateData.fee_lines];
              }
              return updatedOrder;
            }
            return o;
          })
        };
      });

      setIsEditingBilling(false);
      setIsEditingShipping(false);
      setEditingItemId(null);
      setIsAddingDiscount(false);
      setDiscountAmount('');

      return { previousData };
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ['orders'] }, (old: any) => {
        if (!old || !old.orders) return old;
        return {
          ...old,
          orders: old.orders.map((o: any) => o.id === data.id ? { ...o, ...data, fee_lines: data.fee_lines } : o)
        };
      });
    },
    onError: (err, updateData, context: any) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      alert("Failed to update order: " + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const handleEditBilling = () => {
    if (!order) return;
    setBillingForm({ ...order.billing });
    setIsEditingBilling(true);
  };
  
  const handleEditShipping = () => {
    if (!order) return;
    setShippingForm({ ...order.shipping });
    setIsEditingShipping(true);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[540px] md:w-[700px] lg:w-[900px] xl:w-[1100px] !max-w-none overflow-hidden flex flex-col p-0 bg-[#F0F0F1] dark:bg-background border-l border-border">
        {order && (
          <>
            {/* Classic Header */}
        {/* Classic Productive Header */}
        <div className="px-6 py-3.5 border-b bg-white dark:bg-card shrink-0 flex flex-wrap justify-between items-center z-10 shadow-sm pr-12 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Order #{order.number}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border
              ${order.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : ''}
              ${order.status === 'processing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' : ''}
              ${order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : ''}
              ${order.status === 'pending' || order.status === 'on-hold' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' : ''}
              ${order.status === 'order-confirmed' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' : ''}
              ${order.status === 'ready' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' : ''}
              ${order.status === 'no-response' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' : ''}
              ${order.status === 'waiting' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' : ''}
              ${!['completed', 'processing', 'cancelled', 'failed', 'pending', 'on-hold', 'refunded', 'order-confirmed', 'ready', 'no-response', 'waiting'].includes(order.status) ? 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-muted-foreground border-border' : ''}
            `}>
              {order.status}
            </span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              {format(new Date(order.date_created), 'MMM d, yyyy @ h:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printOrderInvoice(order)}
              className="h-8 px-2.5 text-xs font-medium border border-input rounded-md hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Invoice</span>
            </button>
            <button
              onClick={() => printOrderLabel(order)}
              className="h-8 px-2.5 text-xs font-medium border border-input rounded-md hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print 58mm Label"
            >
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span>58mm Label</span>
            </button>
            {updateOrderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}
            <select 
              className="h-8 text-sm border rounded px-2 bg-background focus:ring-1 focus:ring-primary focus:outline-none capitalize cursor-pointer font-medium"
              value={order.status}
              onChange={(e) => updateOrderMutation.mutate({ status: e.target.value })}
              disabled={updateOrderMutation.isPending}
            >
              <option value={order.status}>{order.status}</option>
              <option disabled>──────────</option>
              {statuses?.filter((s: any) => s.value !== 'any').map((s: any) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              
              {/* Main Column */}
              <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
                
                {/* Order Items Table (Classic) */}
                <div className="bg-white dark:bg-card border shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 dark:bg-muted/30 border-b">
                        <tr>
                          <th className="px-4 py-2 font-medium text-muted-foreground">Item</th>
                          <th className="px-4 py-2 font-medium text-muted-foreground text-right w-24">Cost</th>
                          <th className="px-4 py-2 font-medium text-muted-foreground text-center w-16">Qty</th>
                          <th className="px-4 py-2 font-medium text-muted-foreground text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {order.line_items.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/10">
                            <td className="px-4 py-3 flex items-start gap-3">
                              {item.image?.src ? (
                                <img src={item.image.src} alt={item.name} className="h-10 w-10 rounded-md border bg-white object-cover shrink-0 shadow-sm" />
                              ) : (
                                <div className="h-10 w-10 rounded-md border bg-gray-50 flex items-center justify-center shrink-0 shadow-sm">
                                  <Package className="h-5 w-5 text-gray-300" />
                                </div>
                              )}
                              <div className="min-w-0 pt-0.5">
                                <div className="font-medium text-foreground text-[13px] leading-tight">
                                  {item.name}
                                </div>
                                {item.sku && <div className="text-xs text-muted-foreground mt-1">SKU: {item.sku}</div>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-[13px]">
                              <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{item.price}
                            </td>
                            <td className="px-4 py-3 text-center text-[13px]">
                              × {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-[13px]">
                              {editingItemId === item.id ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />
                                  <input 
                                    type="number" 
                                    className="w-16 h-6 px-1 text-right border rounded text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-white dark:bg-background" 
                                    value={editingItemPrice}
                                    onChange={e => setEditingItemPrice(e.target.value)}
                                    autoFocus
                                  />
                                  <button 
                                    onClick={() => {
                                      if (!editingItemPrice) return;
                                      updateOrderMutation.mutate({
                                        line_items: [{ id: item.id, subtotal: String(editingItemPrice), total: String(editingItemPrice) }]
                                      }, {
                                        onSuccess: () => setEditingItemId(null)
                                      });
                                    }}
                                    disabled={updateOrderMutation.isPending}
                                    className="p-1 hover:bg-green-100 text-green-600 rounded disabled:opacity-50"
                                  >
                                    {updateOrderMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  </button>
                                  <button onClick={() => setEditingItemId(null)} disabled={updateOrderMutation.isPending} className="p-1 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-50">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1 group">
                                  <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{item.total}
                                  <Edit2 
                                    className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer hover:text-foreground transition-opacity" 
                                    onClick={() => { setEditingItemId(item.id); setEditingItemPrice(item.total); }}
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Totals Summary (Classic) */}
                  <div className="border-t bg-gray-50/50 dark:bg-muted/10 p-4 flex justify-end">
                    <div className="flex flex-col items-end gap-3">
                      <table className="w-64 text-[13px]">
                        <tbody>
                          <tr>
                            <td className="py-1 text-muted-foreground">Items Subtotal:</td>
                            <td className="py-1 text-right font-medium">
                              <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />
                              {parseFloat(order.total) - parseFloat(order.shipping_total) - parseFloat(order.total_tax) + parseFloat(order.discount_total)}
                            </td>
                          </tr>
                          {parseFloat(order.discount_total) > 0 && (
                            <tr>
                              <td className="py-1 text-muted-foreground">Discount:</td>
                              <td className="py-1 text-right font-medium text-red-600">
                                -<span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{order.discount_total}
                              </td>
                            </tr>
                          )}
                          {order.fee_lines?.map((fee: any, index: number) => (
                            <tr key={fee.id || `fee-${index}`}>
                              <td className="py-1 text-muted-foreground">{fee.name}:</td>
                              <td className={`py-1 text-right font-medium ${parseFloat(fee.total) < 0 ? 'text-red-600' : ''}`}>
                                {parseFloat(fee.total) < 0 ? '-' : ''}<span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{Math.abs(parseFloat(fee.total))}
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td className="py-1 text-muted-foreground">Shipping:</td>
                            <td className="py-1 text-right font-medium">
                              <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{order.shipping_total}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 text-muted-foreground border-b pb-2">Tax:</td>
                            <td className="py-1 text-right font-medium border-b pb-2">
                              <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{order.total_tax}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 text-foreground font-semibold">Order Total:</td>
                            <td className="py-2 text-right font-bold text-base">
                              <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />{order.total}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      
                      {!isAddingDiscount ? (
                        <button 
                          onClick={() => setIsAddingDiscount(true)}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          + Add Manual Discount
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-white dark:bg-background border rounded p-1 shadow-sm">
                          <span className="text-muted-foreground text-xs pl-1">Amount:</span>
                          <input 
                            type="number" 
                            className="w-16 h-6 px-1 text-right border-b text-xs focus:border-primary focus:outline-none bg-transparent" 
                            placeholder="0.00"
                            value={discountAmount}
                            onChange={e => setDiscountAmount(e.target.value)}
                            autoFocus
                          />
                          <button 
                            onClick={() => {
                              if (!discountAmount) return;
                              updateOrderMutation.mutate({
                                fee_lines: [{ name: 'Manual Discount', total: `-${Math.abs(parseFloat(discountAmount))}` }]
                              }, {
                                onSuccess: () => { setIsAddingDiscount(false); setDiscountAmount(''); }
                              });
                            }}
                            disabled={updateOrderMutation.isPending || !discountAmount}
                            className="p-1 hover:bg-green-100 text-green-600 rounded disabled:opacity-50"
                          >
                            {updateOrderMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </button>
                          <button onClick={() => setIsAddingDiscount(false)} disabled={updateOrderMutation.isPending} className="p-1 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-50">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Status Actions */}
                <div className="bg-white dark:bg-card border shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">Quick Status Update</span>
                  <div className="flex flex-wrap gap-2">
                    {statuses
                      ?.filter((s: any) => 
                        s.value !== 'any' && 
                        s.value !== order.status && 
                        !['pending', 'otp-pending', 'return', 'refunded', 'failed', 'checkout-draft', 'wcf-main-order'].includes(s.value)
                      )
                      .map((s: any) => {
                        let colorClass = "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80 border-gray-200 dark:border-border";
                        let icon = null;
                        
                        if (s.value === 'completed') {
                          colorClass = "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800/50";
                          icon = <Check className="h-3 w-3" />;
                        } else if (s.value === 'processing') {
                          colorClass = "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800/50";
                        } else if (s.value === 'cancelled' || s.value === 'failed' || s.value === 'refunded') {
                          colorClass = "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border-red-200 dark:border-red-800/50";
                          if (s.value === 'cancelled') icon = <X className="h-3 w-3" />;
                        } else if (s.value === 'pending' || s.value === 'on-hold') {
                          colorClass = "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800/50";
                        } else if (s.value === 'order-confirmed') {
                          colorClass = "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40 border-teal-200 dark:border-teal-800/50";
                        } else if (s.value === 'ready') {
                          colorClass = "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 border-purple-200 dark:border-purple-800/50";
                        } else if (s.value === 'no-response') {
                          colorClass = "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 border-orange-200 dark:border-orange-800/50";
                        } else if (s.value === 'waiting') {
                          colorClass = "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800/50";
                        }
                        
                        // Check if this specific button is loading
                        const isThisPending = updateOrderMutation.isPending && updateOrderMutation.variables?.status === s.value;
                        
                        return (
                          <button 
                            key={s.value}
                            onClick={() => updateOrderMutation.mutate({ status: s.value })}
                            disabled={updateOrderMutation.isPending}
                            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 ${colorClass}`}
                          >
                            {isThisPending ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
                            {s.label}
                          </button>
                        );
                    })}
                  </div>
                </div>
                
              </div>
              
              {/* Sidebar Column (Classic) */}
              <div className="w-full lg:w-72 space-y-4 shrink-0">
                
                {/* General Details Panel */}
                <div className="bg-white dark:bg-card border shadow-sm">
                  <div className="px-4 py-2 border-b bg-gray-50 dark:bg-muted/30 font-medium text-sm flex justify-between">
                    <span>Order Actions</span>
                  </div>
                  <div className="p-4 space-y-3 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium text-primary cursor-pointer hover:underline">
                        {order.billing.first_name} {order.billing.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-mono">{order.transaction_id || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer IP:</span>
                      <span className="font-mono">{order.customer_ip_address || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Billing Address Panel */}
                <div className="bg-white dark:bg-card border shadow-sm transition-all duration-300">
                  <div className="px-4 py-2 border-b bg-gray-50 dark:bg-muted/30 font-medium text-sm flex justify-between items-center">
                    <span>Billing Address</span>
                    {!isEditingBilling && (
                      <div className="flex items-center gap-2">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => navigator.clipboard.writeText(Object.values(order.billing).join(' '))} />
                        <Edit2 
                          className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" 
                          onClick={handleEditBilling}
                        />
                      </div>
                    )}
                  </div>
                  
                  {isEditingBilling ? (
                    <div className="p-4 space-y-3 text-[13px] bg-yellow-50/30 dark:bg-muted/10 animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="First Name" value={billingForm.first_name} onChange={e => setBillingForm({...billingForm, first_name: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Last Name" value={billingForm.last_name} onChange={e => setBillingForm({...billingForm, last_name: e.target.value})} />
                      </div>
                      <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Company" value={billingForm.company} onChange={e => setBillingForm({...billingForm, company: e.target.value})} />
                      <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Address 1" value={billingForm.address_1} onChange={e => setBillingForm({...billingForm, address_1: e.target.value})} />
                      <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Address 2" value={billingForm.address_2} onChange={e => setBillingForm({...billingForm, address_2: e.target.value})} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="City" value={billingForm.city} onChange={e => setBillingForm({...billingForm, city: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="State" value={billingForm.state} onChange={e => setBillingForm({...billingForm, state: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Postcode" value={billingForm.postcode} onChange={e => setBillingForm({...billingForm, postcode: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Country" value={billingForm.country} onChange={e => setBillingForm({...billingForm, country: e.target.value})} />
                      </div>
                      <div className="pt-3 border-t space-y-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Email" value={billingForm.email} onChange={e => setBillingForm({...billingForm, email: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Phone" value={billingForm.phone} onChange={e => setBillingForm({...billingForm, phone: e.target.value})} />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button 
                          onClick={() => setIsEditingBilling(false)} 
                          className="px-3 py-1.5 border rounded text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
                          disabled={updateOrderMutation.isPending}
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button 
                          onClick={() => {
                            if (!billingForm.first_name?.trim() && !billingForm.last_name?.trim()) {
                              alert("Name is required.");
                              return;
                            }
                            if (!billingForm.phone?.trim()) {
                              alert("Phone number is required.");
                              return;
                            }
                            const payload: any = {
                              first_name: billingForm.first_name || '',
                              last_name: billingForm.last_name || '',
                              company: billingForm.company || '',
                              address_1: billingForm.address_1 || '',
                              address_2: billingForm.address_2 || '',
                              city: billingForm.city || '',
                              state: billingForm.state || '',
                              postcode: billingForm.postcode || '',
                              country: billingForm.country || '',
                              phone: billingForm.phone || ''
                            };
                            if (billingForm.email?.trim()) {
                              payload.email = billingForm.email.trim();
                            }
                            updateOrderMutation.mutate({ billing: payload });
                          }} 
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 flex items-center gap-1 shadow-sm" 
                          disabled={updateOrderMutation.isPending}
                        >
                          {updateOrderMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Save Address
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-[13px] leading-relaxed animate-in fade-in duration-200">
                      <p className="font-medium">{order.billing.first_name} {order.billing.last_name}</p>
                      {order.billing.company && <p>{order.billing.company}</p>}
                      <p>{order.billing.address_1}</p>
                      {order.billing.address_2 && <p>{order.billing.address_2}</p>}
                      <p>{order.billing.city}, {order.billing.state} {order.billing.postcode}</p>
                      <p>{order.billing.country}</p>
                      
                      <div className="mt-3 space-y-2 pt-3 border-t">
                        {order.billing.email && (
                          <p className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                            <Mail className="h-3.5 w-3.5" /> {order.billing.email}
                          </p>
                        )}
                        {order.billing.phone && (
                          <div className="space-y-2 pt-1">
                            <p className="flex items-center gap-2 text-foreground font-semibold">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {order.billing.phone}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={`tel:${order.billing.phone}`}
                                className="flex-1 py-1.5 px-3 text-xs border rounded-md hover:bg-muted text-foreground flex items-center justify-center gap-1.5 cursor-pointer transition-colors font-medium shadow-xs"
                                title="Call Customer"
                              >
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Call
                              </a>
                              <a
                                href={`https://wa.me/${order.billing.phone.replace(/[^\d]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 px-3 text-xs border border-green-300 dark:border-green-800 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400 rounded-md flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors shadow-xs"
                                title="Open WhatsApp Chat"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Address Panel */}
                <div className="bg-white dark:bg-card border shadow-sm transition-all duration-300">
                  <div className="px-4 py-2 border-b bg-gray-50 dark:bg-muted/30 font-medium text-sm flex justify-between items-center">
                    <span>Shipping Address</span>
                    {!isEditingShipping && (
                      <div className="flex items-center gap-2">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => navigator.clipboard.writeText(Object.values(order.shipping || {}).join(' '))} />
                        <Edit2 
                          className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" 
                          onClick={handleEditShipping}
                        />
                      </div>
                    )}
                  </div>
                  
                  {isEditingShipping ? (
                    <div className="p-4 space-y-3 text-[13px] bg-yellow-50/30 dark:bg-muted/10 animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="First Name" value={shippingForm?.first_name || ''} onChange={e => setShippingForm({...shippingForm, first_name: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Last Name" value={shippingForm?.last_name || ''} onChange={e => setShippingForm({...shippingForm, last_name: e.target.value})} />
                      </div>
                      <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Company" value={shippingForm?.company || ''} onChange={e => setShippingForm({...shippingForm, company: e.target.value})} />
                      <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Address 1" value={shippingForm?.address_1 || ''} onChange={e => setShippingForm({...shippingForm, address_1: e.target.value})} />
                      <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Address 2" value={shippingForm?.address_2 || ''} onChange={e => setShippingForm({...shippingForm, address_2: e.target.value})} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="City" value={shippingForm?.city || ''} onChange={e => setShippingForm({...shippingForm, city: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="State" value={shippingForm?.state || ''} onChange={e => setShippingForm({...shippingForm, state: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Postcode" value={shippingForm?.postcode || ''} onChange={e => setShippingForm({...shippingForm, postcode: e.target.value})} />
                        <input className="border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Country" value={shippingForm?.country || ''} onChange={e => setShippingForm({...shippingForm, country: e.target.value})} />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button 
                          onClick={() => setIsEditingShipping(false)} 
                          className="px-3 py-1.5 border rounded text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
                          disabled={updateOrderMutation.isPending}
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button 
                          onClick={() => {
                            const payload = {
                              first_name: shippingForm?.first_name || '',
                              last_name: shippingForm?.last_name || '',
                              company: shippingForm?.company || '',
                              address_1: shippingForm?.address_1 || '',
                              address_2: shippingForm?.address_2 || '',
                              city: shippingForm?.city || '',
                              state: shippingForm?.state || '',
                              postcode: shippingForm?.postcode || '',
                              country: shippingForm?.country || ''
                            };
                            updateOrderMutation.mutate({ shipping: payload });
                          }} 
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 flex items-center gap-1 shadow-sm" 
                          disabled={updateOrderMutation.isPending}
                        >
                          {updateOrderMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Save Address
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-[13px] leading-relaxed animate-in fade-in duration-200">
                      {order.shipping?.first_name ? (
                        <>
                          <p className="font-medium">{order.shipping.first_name} {order.shipping.last_name}</p>
                          {order.shipping.company && <p>{order.shipping.company}</p>}
                          <p>{order.shipping.address_1}</p>
                          {order.shipping.address_2 && <p>{order.shipping.address_2}</p>}
                          <p>{order.shipping.city}, {order.shipping.state} {order.shipping.postcode}</p>
                          <p>{order.shipping.country}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground italic">No shipping address provided.</p>
                      )}
                    </div>
                  )}
                </div>


                {/* Admin Order Notes / Timeline */}
                <div className="bg-white dark:bg-card border shadow-sm">
                  <div className="px-4 py-2 border-b bg-gray-50 dark:bg-muted/30 font-medium text-sm">
                    Order Timeline & Notes
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <textarea 
                        className="w-full border border-border/50 bg-white dark:bg-background px-2 py-1.5 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]" 
                        placeholder="Add private note..." 
                        value={newAdminNote} 
                        onChange={e => setNewAdminNote(e.target.value)}
                        disabled={isAddingNote}
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={() => {
                            if (!newAdminNote.trim()) return;
                            addNote({ note: newAdminNote, isCustomerNote: false }, {
                              onSuccess: () => setNewAdminNote('')
                            });
                          }} 
                          disabled={!newAdminNote.trim() || isAddingNote}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-xs font-medium hover:bg-secondary/80 flex items-center gap-1 shadow-sm disabled:opacity-50"
                        >
                          {isAddingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Add Note
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                      {isNotesLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : !orderNotes || orderNotes.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground text-center italic py-2">No timeline events found.</p>
                      ) : (
                        orderNotes.map((note: any) => (
                          <div key={note.id} className="relative pl-4 border-l-2 border-border/50">
                            <div className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${note.customer_note ? 'bg-primary' : (note.author === 'system' ? 'bg-muted-foreground/40' : 'bg-blue-500')}`} />
                            <div className="text-[12px] text-muted-foreground flex justify-between items-center mb-0.5">
                              <span className="font-medium text-foreground/80 capitalize">
                                {note.author === 'system' ? 'System' : note.author}
                              </span>
                              <span title={format(new Date(note.date_created), 'PPpp')}>
                                {formatDistanceToNow(new Date(note.date_created), { addSuffix: true })}
                              </span>
                            </div>
                            <div 
                              className={`text-[13px] leading-relaxed p-2 rounded ${note.customer_note ? 'bg-primary/5 text-primary-foreground/90' : (note.author === 'system' ? 'bg-muted/30 text-muted-foreground' : 'bg-blue-50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-100')}`}
                              dangerouslySetInnerHTML={{ __html: note.note }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

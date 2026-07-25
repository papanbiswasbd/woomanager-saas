import { format } from 'date-fns';
import { useSettingsStore } from '@/lib/store';

export function printOrderInvoice(order: any) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert("Please allow popups to print invoices.");
    return;
  }

  const { shopName, shopLogoUrl, shopAddress, shopPhone, invoiceFooterText } = useSettingsStore.getState();

  const billing = order.billing || {};
  const shipping = order.shipping || {};
  const lineItems = order.line_items || [];
  const currencySymbol = order.currency_symbol || '$';
  const lineItemsSum = lineItems.reduce((acc: number, item: any) => acc + (parseFloat(item.total || '0') || (parseFloat(item.price || '0') * (item.quantity || 1))), 0);
  const shippingFee = parseFloat(order.shipping_total || '0') || 0;
  const grandTotalNum = parseFloat(order.total || '0') || (lineItemsSum + shippingFee);
  const itemsSubtotal = lineItemsSum > 0 ? lineItemsSum : Math.max(0, grandTotalNum - shippingFee);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${order.number}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          @media print {
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #111; }
            .no-print { display: none; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 40px;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand-logo {
            max-height: 60px;
            max-width: 220px;
            object-fit: contain;
            margin-bottom: 8px;
          }
          .shop-title {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 4px;
          }
          .shop-details {
            font-size: 13px;
            color: #4b5563;
            line-height: 1.4;
            white-space: pre-line;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: 900;
            color: #111827;
            letter-spacing: -0.5px;
            text-align: right;
          }
          .meta {
            text-align: right;
            font-size: 13px;
            color: #6b7280;
            margin-top: 8px;
          }
          .meta strong {
            color: #111827;
          }
          .addresses {
            display: flex;
            justify-content: space-between;
            gap: 30px;
            margin-bottom: 35px;
          }
          .address-box {
            flex: 1;
            background: #f9fafb;
            padding: 16px 20px;
            border-radius: 8px;
            border: 1px solid #f3f4f6;
          }
          .address-box h3 {
            margin-top: 0;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
          }
          .address-box p {
            margin: 4px 0;
            font-size: 13.5px;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background: #f3f4f6;
            text-align: left;
            padding: 12px 16px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4b5563;
          }
          td {
            padding: 14px 16px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          .text-right { text-align: right; }
          .totals {
            margin-left: auto;
            width: 280px;
            margin-bottom: 40px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
            color: #4b5563;
          }
          .totals-row.grand {
            border-top: 2px solid #111827;
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            padding-top: 12px;
            margin-top: 4px;
          }
          .footer {
            text-align: center;
            font-size: 13px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 24px;
            margin-top: 40px;
          }
          .print-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 20px;
          }
          .print-btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" class="print-btn">Print Invoice</button>
        </div>
        <div class="header">
          <div>
            ${shopLogoUrl ? `<img src="${shopLogoUrl}" alt="Logo" class="brand-logo" />` : `<div class="shop-title">${shopName || 'STORE INVOICE'}</div>`}
            ${shopAddress ? `<div class="shop-details">${shopAddress}</div>` : ''}
            ${shopPhone ? `<div class="shop-details">Phone: ${shopPhone}</div>` : ''}
          </div>
          <div>
            <div class="invoice-title">INVOICE</div>
            <div class="meta">
              <div>Order: <strong>#${order.number}</strong></div>
              <div style="margin-top: 4px;">Date: <strong>${format(new Date(order.date_created), 'MMMM d, yyyy')}</strong></div>
              <div style="margin-top: 4px;">Payment: <strong>${order.payment_method_title || 'N/A'}</strong></div>
              <div style="margin-top: 4px;">Status: <strong style="text-transform: capitalize;">${order.status}</strong></div>
            </div>
          </div>
        </div>

        <div class="addresses">
          <div class="address-box">
            <h3>Billed To</h3>
            <p><strong>${billing.first_name || ''} ${billing.last_name || ''}</strong></p>
            <p>${billing.address_1 || ''}</p>
            <p>${[billing.city, billing.state, billing.postcode].filter(Boolean).join(', ')}</p>
            <p>${billing.email || ''}</p>
            <p>${billing.phone || ''}</p>
          </div>
          <div class="address-box">
            <h3>Shipped To</h3>
            <p><strong>${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}</strong></p>
            <p>${shipping.address_1 || billing.address_1 || '-'}</p>
            <p>${[shipping.city || billing.city, shipping.state || billing.state, shipping.postcode || billing.postcode].filter(Boolean).join(', ')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map((item: any) => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${currencySymbol}${item.total || (parseFloat(item.price || '0') * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Items Subtotal</span>
            <span>${currencySymbol}${itemsSubtotal.toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Shipping Fee</span>
            <span>${currencySymbol}${shippingFee.toFixed(2)}</span>
          </div>
          <div class="totals-row grand">
            <span>Total Amount</span>
            <span>${currencySymbol}${grandTotalNum.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${invoiceFooterText || 'Thank you for your business!'}</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

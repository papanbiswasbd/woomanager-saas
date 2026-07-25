import { format } from 'date-fns';
import { useSettingsStore } from '@/lib/store';

export function printOrderLabel(order: any) {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert("Please allow popups to print labels.");
    return;
  }

  const { shopName, shopPhone } = useSettingsStore.getState();

  const billing = order.billing || {};
  const shipping = order.shipping || {};
  const lineItems = order.line_items || [];
  const currencySymbol = order.currency_symbol || '$';

  const recipientName = `${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`.trim();
  const addressLine = shipping.address_1 || billing.address_1 || '';
  const cityState = [shipping.city || billing.city, shipping.state || billing.state, shipping.postcode || billing.postcode].filter(Boolean).join(', ');
  const phone = shipping.phone || billing.phone || '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label #${order.number}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          @media print {
            body { margin: 0; padding: 3mm; width: 52mm; }
            .no-print { display: none; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            width: 52mm;
            margin: 0 auto;
            padding: 8px;
            background: #fff;
            color: #000;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.2;
          }
          .label-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .shop-tag {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .order-num {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .date {
            font-size: 9px;
            color: #333;
          }
          .section {
            border-bottom: 1px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .section-title {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .recipient-name {
            font-size: 13px;
            font-weight: 800;
            margin-bottom: 2px;
          }
          .address {
            font-size: 11px;
            font-weight: 600;
            word-wrap: break-word;
          }
          .phone {
            font-size: 12px;
            font-weight: 800;
            margin-top: 3px;
          }
          .items-list {
            margin-top: 4px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            line-height: 1.4;
            margin-bottom: 4px;
            padding-bottom: 2px;
          }
          .item-name {
            font-weight: 600;
            flex: 1;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
            padding-bottom: 2px;
          }
          .item-qty {
            font-weight: 800;
            white-space: nowrap;
          }
          .total-box {
            text-align: center;
            padding: 4px;
            border: 1.5px solid #000;
            margin-top: 6px;
            border-radius: 4px;
          }
          .total-amount {
            font-size: 16px;
            font-weight: 900;
          }
          .payment-type {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .print-btn {
            background: #000;
            color: #fff;
            border: none;
            padding: 6px 12px;
            font-size: 11px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" class="print-btn">Print 58mm Label</button>
        </div>

        <div class="label-header">
          ${shopName ? `<div class="shop-tag">${shopName}</div>` : ''}
          <div class="order-num">#${order.number}</div>
          <div class="date">${format(new Date(order.date_created), 'dd/MM/yyyy hh:mm a')}</div>
        </div>

        <div class="section">
          <div class="section-title">Deliver To:</div>
          <div class="recipient-name">${recipientName}</div>
          <div class="address">${addressLine}</div>
          ${cityState ? `<div class="address">${cityState}</div>` : ''}
          ${phone ? `<div class="phone">📞 ${phone}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Items (${lineItems.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0)})</div>
          <div class="items-list">
            ${lineItems.map((item: any) => {
              const rawName = item.name || '';
              const truncatedName = rawName.length > 30 ? rawName.slice(0, 27) + '...' : rawName;
              return `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                  <tr>
                    <td style="font-size: 11px; font-weight: 600; text-align: left; padding: 0; color: #000; line-height: 1.4; vertical-align: middle;">
                      ${truncatedName}
                    </td>
                    <td style="font-size: 11px; font-weight: 800; text-align: right; padding: 0 0 0 6px; color: #000; white-space: nowrap; width: 25px; vertical-align: middle; line-height: 1.4;">
                      x${item.quantity}
                    </td>
                  </tr>
                </table>
              `;
            }).join('')}
          </div>
        </div>

        <div class="total-box">
          <div class="payment-type">${order.payment_method_title || 'Cash on Delivery'}</div>
          <div class="total-amount">${currencySymbol}${order.total}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

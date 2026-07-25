import { format } from 'date-fns';
import { useSettingsStore } from '@/lib/store';

export async function downloadOrderInvoicePDF(order: any) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const { shopName, shopLogoUrl, shopAddress, shopPhone, invoiceFooterText } = useSettingsStore.getState();

    const billing = order.billing || {};
    const shipping = order.shipping || {};
    const lineItems = order.line_items || [];
    const currencySymbol = order.currency_symbol || '$';

    const lineItemsSum = lineItems.reduce((acc: number, item: any) => acc + (parseFloat(item.total || '0') || (parseFloat(item.price || '0') * (item.quantity || 1))), 0);
    const shippingFee = parseFloat(order.shipping_total || '0') || 0;
    const grandTotalNum = parseFloat(order.total || '0') || (lineItemsSum + shippingFee);
    const itemsSubtotal = lineItemsSum > 0 ? lineItemsSum : Math.max(0, grandTotalNum - shippingFee);

    // Create temporary offscreen container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '750px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#1f2937';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          ${shopLogoUrl ? `<img src="${shopLogoUrl}" alt="Logo" style="max-height: 55px; max-width: 200px; object-fit: contain; margin-bottom: 8px; display: block;" />` : `<div style="font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 4px;">${shopName || 'STORE INVOICE'}</div>`}
          ${shopAddress ? `<div style="font-size: 13px; color: #4b5563; line-height: 1.4; white-space: pre-line;">${shopAddress}</div>` : ''}
          ${shopPhone ? `<div style="font-size: 13px; color: #4b5563;">Phone: ${shopPhone}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 28px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">INVOICE</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 8px; line-height: 1.5;">
            <div>Order: <strong style="color: #111827;">#${order.number}</strong></div>
            <div>Date: <strong style="color: #111827;">${format(new Date(order.date_created), 'MMMM d, yyyy')}</strong></div>
            <div>Payment: <strong style="color: #111827;">${order.payment_method_title || 'N/A'}</strong></div>
            <div>Status: <strong style="color: #111827; text-transform: capitalize;">${order.status}</strong></div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 30px; margin-bottom: 35px;">
        <div style="flex: 1; background: #f9fafb; padding: 16px 20px; border-radius: 8px; border: 1px solid #f3f4f6;">
          <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Billed To</h3>
          <p style="margin: 4px 0; font-size: 13.5px; font-weight: 700;">${billing.first_name || ''} ${billing.last_name || ''}</p>
          <p style="margin: 4px 0; font-size: 13px;">${billing.address_1 || ''}</p>
          <p style="margin: 4px 0; font-size: 13px;">${[billing.city, billing.state, billing.postcode].filter(Boolean).join(', ')}</p>
          ${billing.email ? `<p style="margin: 4px 0; font-size: 13px;">${billing.email}</p>` : ''}
          ${billing.phone ? `<p style="margin: 4px 0; font-size: 13px;">${billing.phone}</p>` : ''}
        </div>
        <div style="flex: 1; background: #f9fafb; padding: 16px 20px; border-radius: 8px; border: 1px solid #f3f4f6;">
          <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Shipped To</h3>
          <p style="margin: 4px 0; font-size: 13.5px; font-weight: 700;">${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}</p>
          <p style="margin: 4px 0; font-size: 13px;">${shipping.address_1 || billing.address_1 || '-'}</p>
          <p style="margin: 4px 0; font-size: 13px;">${[shipping.city || billing.city, shipping.state || billing.state, shipping.postcode || billing.postcode].filter(Boolean).join(', ')}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #4b5563;">Item</th>
            <th style="text-align: right; padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #4b5563;">Qty</th>
            <th style="text-align: right; padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #4b5563;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map((item: any) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 14px 16px; font-size: 14px; font-weight: 600;">${item.name}</td>
              <td style="padding: 14px 16px; font-size: 14px; text-align: right;">${item.quantity}</td>
              <td style="padding: 14px 16px; font-size: 14px; text-align: right;">${currencySymbol}${item.total || (parseFloat(item.price || '0') * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-left: auto; width: 280px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #4b5563;">
          <span>Items Subtotal</span>
          <span>${currencySymbol}${itemsSubtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #4b5563;">
          <span>Shipping Fee</span>
          <span>${currencySymbol}${shippingFee.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: 800; border-top: 2px solid #111827; color: #111827; margin-top: 4px;">
          <span>Total Amount</span>
          <span>${currencySymbol}${grandTotalNum.toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="margin: 0;">${invoiceFooterText || 'Thank you for your business!'}</p>
      </div>
    `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Strip all external & page stylesheets from cloned document to avoid Tailwind v4 color functions
        const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach((style) => style.remove());
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.body.style.color = '#1f2937';
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.padding = '0';
      }
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // proportional height in mm

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice_Order_${order.number}.pdf`);
  } catch (err) {
    console.error("PDF Download error:", err);
    alert("Failed to download PDF invoice. Please try again.");
  }
}

import { format } from 'date-fns';
import { useSettingsStore } from '@/lib/store';

export async function downloadOrderLabelPNG(order: any) {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const { shopName } = useSettingsStore.getState();

    const billing = order.billing || {};
    const shipping = order.shipping || {};
    const lineItems = order.line_items || [];
    const currencySymbol = order.currency_symbol || '$';

    const recipientName = `${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`.trim();
    const addressLine = shipping.address_1 || billing.address_1 || '';
    const cityState = [shipping.city || billing.city, shipping.state || billing.state, shipping.postcode || billing.postcode].filter(Boolean).join(', ');
    const phone = shipping.phone || billing.phone || '';

    // Create temporary offscreen container for 58mm label
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '240px';
    container.style.padding = '12px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        ${shopName ? `<div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${shopName}</div>` : ''}
        <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">#${order.number}</div>
        <div style="font-size: 10px; color: #333;">${format(new Date(order.date_created), 'dd/MM/yyyy hh:mm a')}</div>
      </div>

      <div style="border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Deliver To:</div>
        <div style="font-size: 14px; font-weight: 800; margin-bottom: 3px;">${recipientName}</div>
        <div style="font-size: 11.5px; font-weight: 600; word-wrap: break-word;">${addressLine}</div>
        ${cityState ? `<div style="font-size: 11.5px; font-weight: 600;">${cityState}</div>` : ''}
        ${phone ? `<div style="font-size: 13px; font-weight: 800; margin-top: 4px;">📞 ${phone}</div>` : ''}
      </div>

      <div style="border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Items (${lineItems.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0)})</div>
        <div>
          ${lineItems.map((item: any) => {
            const rawName = item.name || '';
            const truncatedName = rawName.length > 30 ? rawName.slice(0, 27) + '...' : rawName;
            return `
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                <tr>
                  <td style="font-size: 11px; font-weight: 600; text-align: left; padding: 0; color: #000000; line-height: 1.4; vertical-align: middle;">
                    ${truncatedName}
                  </td>
                  <td style="font-size: 11px; font-weight: 800; text-align: right; padding: 0 0 0 6px; color: #000000; white-space: nowrap; width: 25px; vertical-align: middle; line-height: 1.4;">
                    x${item.quantity}
                  </td>
                </tr>
              </table>
            `;
          }).join('')}
        </div>
      </div>

      <div style="text-align: center; padding: 6px; border: 2px solid #000; margin-top: 8px; border-radius: 4px;">
        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase;">${order.payment_method_title || 'Cash on Delivery'}</div>
        <div style="font-size: 18px; font-weight: 900;">${currencySymbol}${order.total}</div>
      </div>
    `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Strip all external & page stylesheets from cloned document to avoid Tailwind v4 color functions
        const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach((style) => style.remove());
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.body.style.color = '#000000';
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.padding = '0';
      }
    });

    document.body.removeChild(container);

    const imgUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `Label_Order_${order.number}.png`;
    link.click();
  } catch (err) {
    console.error("PNG Label Download error:", err);
    alert("Failed to download PNG label. Please try again.");
  }
}

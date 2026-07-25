import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, method, data, url, consumerKey, consumerSecret, apiNamespace } = body;

    if (!endpoint || !url || !consumerKey || !consumerSecret) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Ensure URL is correctly formatted for REST (remove trailing slashes)
    const restUrl = url.replace(/\/+$/, '');
    
    // Construct the target URL
    const namespace = apiNamespace || 'wc/v3';
    const targetUrl = `${restUrl}/wp-json/${namespace}/${endpoint}`;

    // Create Basic Auth header
    const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(targetUrl, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: result.message || 'Error from WooCommerce API', details: result.data }, { status: response.status });
    }

    // --- INSTANT LOCAL SYNC ---
    // Update the local database with the exact response returned by WooCommerce
    if (endpoint === 'orders/batch' && method === 'POST') {
      try {
        if (result && result.update && Array.isArray(result.update)) {
          // Process all successfully updated orders from the batch response
          const updatePromises = result.update.map((order: any) => {
            if (!order || !order.id) return Promise.resolve();
            if (order.error) return Promise.resolve(); // Skip failed items in batch
            
            return db.order.update({
              where: { id: order.id },
              data: {
                number: order.number,
                status: order.status,
                date_modified: order.date_modified ? new Date(order.date_modified) : new Date(),
                payment_method_title: order.payment_method_title,
                transaction_id: order.transaction_id,
                customer_ip_address: order.customer_ip_address,
                currency_symbol: order.currency_symbol || '$',
                total: order.total,
                total_tax: order.total_tax,
                discount_total: order.discount_total,
                shipping_total: order.shipping_total,
                customer_note: order.customer_note,
                billing: JSON.stringify(order.billing),
                shipping: JSON.stringify(order.shipping),
                line_items: JSON.stringify(order.line_items),
                fee_lines: JSON.stringify(order.fee_lines || []),
              }
            }).catch(e => console.error("Failed to sync individual batch order", order.id, e));
          });
          
          await Promise.all(updatePromises);
        }
      } catch (dbErr) {
        console.error("Local DB batch update failed, waiting for webhook:", dbErr);
      }
    } else if ((endpoint === 'orders' || endpoint.startsWith('orders/')) && (method === 'POST' || method === 'PUT')) {
      try {
        if (result && result.id) {
          const order = result;
          const orderData = {
            number: String(order.number || order.id),
            status: order.status || 'processing',
            date_created: order.date_created ? new Date(order.date_created) : new Date(),
            date_modified: order.date_modified ? new Date(order.date_modified) : new Date(),
            payment_method_title: order.payment_method_title || 'Cash on Delivery',
            transaction_id: order.transaction_id || '',
            customer_ip_address: order.customer_ip_address || '',
            currency_symbol: order.currency_symbol || '$',
            total: String(order.total || '0'),
            total_tax: String(order.total_tax || '0'),
            discount_total: String(order.discount_total || '0'),
            shipping_total: String(order.shipping_total || '0'),
            customer_note: order.customer_note || '',
            billing: JSON.stringify(order.billing || {}),
            shipping: JSON.stringify(order.shipping || {}),
            line_items: JSON.stringify(order.line_items || []),
            fee_lines: JSON.stringify(order.fee_lines || []),
          };

          await db.order.upsert({
            where: { id: order.id },
            update: orderData,
            create: {
              id: order.id,
              ...orderData
            }
          });
        }
      } catch (dbErr) {
        console.error("Local DB upsert failed, waiting for webhook:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("WooCommerce Proxy Error:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

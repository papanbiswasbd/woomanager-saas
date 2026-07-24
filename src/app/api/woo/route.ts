import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, method, data, url, consumerKey, consumerSecret } = body;

    if (!endpoint || !url || !consumerKey || !consumerSecret) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Ensure URL is correctly formatted for REST (remove trailing slashes)
    const restUrl = url.replace(/\/+$/, '');
    
    // Construct the target URL
    const targetUrl = `${restUrl}/wp-json/wc/v3/${endpoint}`;

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
      return NextResponse.json({ message: result.message || 'Error from WooCommerce API' }, { status: response.status });
    }

    // --- INSTANT LOCAL SYNC ---
    // Update the local database with the exact response returned by WooCommerce
    if (endpoint.startsWith('orders/') && (method === 'POST' || method === 'PUT')) {
      try {
        const orderId = parseInt(endpoint.split('/')[1]);
        if (!isNaN(orderId) && result && result.id) {
          const order = result;
          await db.order.update({
            where: { id: orderId },
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
          });
        }
      } catch (dbErr) {
        console.error("Local DB update failed, waiting for webhook:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("WooCommerce Proxy Error:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

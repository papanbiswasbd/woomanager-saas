import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, consumerKey, consumerSecret, page = 1 } = body;

    if (!url || !consumerKey || !consumerSecret) {
      return NextResponse.json({ message: 'Missing required credentials' }, { status: 400 });
    }

    const restUrl = url.replace(/\/+$/, '');
    let targetUrl = `${restUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}`;

    // Delta Sync: Check for the latest modified order
    const latestOrder = await db.order.findFirst({
      orderBy: { date_modified: 'desc' }
    });

    if (latestOrder && latestOrder.date_modified) {
      // WooCommerce accepts ISO 8601 strings
      targetUrl += `&modified_after=${latestOrder.date_modified.toISOString()}`;
    }

    const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      const result = await response.json();
      return NextResponse.json({ message: result.message || 'Error fetching from WooCommerce' }, { status: response.status });
    }

    const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1');
    const hasMore = page < totalPages;
    const orders = await response.json();

    // Upsert orders into Prisma local database concurrently for maximum speed
    await Promise.all(
      orders.map((order: any) =>
        db.order.upsert({
          where: { id: order.id },
          update: {
            number: order.number,
            status: order.status,
            date_created: new Date(order.date_created),
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
          },
          create: {
            id: order.id,
            number: order.number,
            status: order.status,
            date_created: new Date(order.date_created),
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
        })
      )
    );

    return NextResponse.json({ success: true, count: orders.length, hasMore, totalPages });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

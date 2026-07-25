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
    let targetUrl = `${restUrl}/wp-json/wc/v3/customers?per_page=100&page=${page}`;

    // Delta Sync: Check for the latest modified customer
    const latestCustomer = await db.customer.findFirst({
      orderBy: { date_modified: 'desc' }
    });

    if (latestCustomer && latestCustomer.date_modified) {
      // WooCommerce accepts ISO 8601 strings
      targetUrl += `&modified_after=${latestCustomer.date_modified.toISOString()}`;
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
    const customers = await response.json();

    // Upsert customers into Prisma local database
    await Promise.all(
      customers.map((customer: any) => {
        const customerData = {
          email: customer.email || '',
          first_name: customer.first_name || '',
          last_name: customer.last_name || '',
          role: customer.role || '',
          username: customer.username || '',
          billing: JSON.stringify(customer.billing || {}),
          shipping: JSON.stringify(customer.shipping || {}),
          is_paying_customer: customer.is_paying_customer || false,
          orders_count: customer.orders_count || 0,
          total_spent: customer.total_spent || '0',
          date_created: customer.date_created ? new Date(customer.date_created) : new Date(),
          date_modified: customer.date_modified ? new Date(customer.date_modified) : new Date(),
        };

        return db.customer.upsert({
          where: { id: customer.id },
          update: customerData,
          create: {
            id: customer.id,
            ...customerData
          }
        });
      })
    );

    return NextResponse.json({ success: true, count: customers.length, hasMore, totalPages });
  } catch (error: any) {
    console.error("Customer Sync Error:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

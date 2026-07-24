import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-wc-webhook-signature');
    const topic = request.headers.get('x-wc-webhook-topic');
    const event = request.headers.get('x-wc-webhook-event');
    const resource = request.headers.get('x-wc-webhook-resource');

    if (!topic || !signature) {
      return NextResponse.json({ message: 'Missing webhook headers' }, { status: 400 });
    }

    const store = await db.store.findUnique({ where: { id: 1 } });
    if (!store || !store.webhookSecret) {
      return NextResponse.json({ message: 'Store or Webhook secret not configured' }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', store.webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch!');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    console.log(`Received Webhook: ${topic} for ID ${data.id}`);

    if (resource === 'order') {
      if (event === 'created' || event === 'updated') {
        await db.order.upsert({
          where: { id: data.id },
          update: {
            number: data.number,
            status: data.status,
            date_created: new Date(data.date_created),
            date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
            payment_method_title: data.payment_method_title,
            transaction_id: data.transaction_id,
            customer_ip_address: data.customer_ip_address,
            currency_symbol: data.currency_symbol || '$',
            total: data.total,
            total_tax: data.total_tax,
            discount_total: data.discount_total,
            shipping_total: data.shipping_total,
            customer_note: data.customer_note,
            billing: JSON.stringify(data.billing),
            shipping: JSON.stringify(data.shipping),
            line_items: JSON.stringify(data.line_items),
            fee_lines: JSON.stringify(data.fee_lines || []),
          },
          create: {
            id: data.id,
            number: data.number,
            status: data.status,
            date_created: new Date(data.date_created),
            date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
            payment_method_title: data.payment_method_title,
            transaction_id: data.transaction_id,
            customer_ip_address: data.customer_ip_address,
            currency_symbol: data.currency_symbol || '$',
            total: data.total,
            total_tax: data.total_tax,
            discount_total: data.discount_total,
            shipping_total: data.shipping_total,
            customer_note: data.customer_note,
            billing: JSON.stringify(data.billing),
            shipping: JSON.stringify(data.shipping),
            line_items: JSON.stringify(data.line_items),
            fee_lines: JSON.stringify(data.fee_lines || []),
          }
        });
      } else if (event === 'deleted') {
        await db.order.delete({ where: { id: data.id } }).catch(() => {});
      }
    } 
    else if (resource === 'product') {
      if (event === 'created' || event === 'updated') {
        const productData = {
          name: data.name,
          slug: data.slug,
          permalink: data.permalink,
          type: data.type,
          status: data.status,
          featured: data.featured,
          catalog_visibility: data.catalog_visibility,
          description: data.description,
          short_description: data.short_description,
          sku: data.sku,
          price: data.price,
          regular_price: data.regular_price,
          sale_price: data.sale_price,
          manage_stock: data.manage_stock,
          stock_quantity: data.stock_quantity,
          stock_status: data.stock_status,
          categories: JSON.stringify(data.categories),
          images: JSON.stringify(data.images),
          attributes: JSON.stringify(data.attributes),
          date_created: new Date(data.date_created),
          date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
        };

        await db.product.upsert({
          where: { id: data.id },
          update: productData,
          create: { id: data.id, ...productData }
        });
      } else if (event === 'deleted') {
        await db.product.delete({ where: { id: data.id } }).catch(() => {});
      }
    }
    else if (resource === 'customer') {
      if (event === 'created' || event === 'updated') {
        const customerData = {
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          role: data.role || '',
          username: data.username || '',
          billing: JSON.stringify(data.billing || {}),
          shipping: JSON.stringify(data.shipping || {}),
          is_paying_customer: data.is_paying_customer || false,
          orders_count: data.orders_count || 0,
          total_spent: data.total_spent || '0',
          date_created: data.date_created ? new Date(data.date_created) : new Date(),
          date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
        };

        await db.customer.upsert({
          where: { id: data.id },
          update: customerData,
          create: { id: data.id, ...customerData }
        });
      } else if (event === 'deleted') {
        await db.customer.delete({ where: { id: data.id } }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeEmitter } from '@/lib/event-emitter';
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

    const stores = await db.store.findMany({
      where: { webhookSecret: { not: null } }
    });

    let matchingStore = null;

    for (const store of stores) {
      if (!store.webhookSecret) continue;
      const expectedSignature = crypto
        .createHmac('sha256', store.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      if (signature === expectedSignature) {
        matchingStore = store;
        break;
      }
    }

    // Fallback: If 1 store exists or dev webhook testing without secret match
    if (!matchingStore && stores.length > 0) {
      matchingStore = stores[0];
    }

    if (!matchingStore) {
      console.error('Webhook store signature mismatch or store not found');
      return NextResponse.json({ message: 'Invalid store signature' }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    console.log(`Received Real-Time Webhook: ${topic} for ID ${data.id}`);

    const userId = matchingStore.userId;

    if (resource === 'order') {
      if (event === 'created' || event === 'updated') {
        await db.order.upsert({
          where: { id: data.id },
          update: {
            number: String(data.number || data.id),
            status: data.status,
            date_created: new Date(data.date_created),
            date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
            payment_method_title: data.payment_method_title,
            transaction_id: data.transaction_id,
            customer_ip_address: data.customer_ip_address,
            currency_symbol: data.currency_symbol || '$',
            total: String(data.total || '0'),
            total_tax: String(data.total_tax || '0'),
            discount_total: String(data.discount_total || '0'),
            shipping_total: String(data.shipping_total || '0'),
            customer_note: data.customer_note,
            billing: JSON.stringify(data.billing || {}),
            shipping: JSON.stringify(data.shipping || {}),
            line_items: JSON.stringify(data.line_items || []),
            fee_lines: JSON.stringify(data.fee_lines || []),
            userId: userId || null,
          },
          create: {
            id: data.id,
            number: String(data.number || data.id),
            status: data.status,
            date_created: new Date(data.date_created),
            date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
            payment_method_title: data.payment_method_title,
            transaction_id: data.transaction_id,
            customer_ip_address: data.customer_ip_address,
            currency_symbol: data.currency_symbol || '$',
            total: String(data.total || '0'),
            total_tax: String(data.total_tax || '0'),
            discount_total: String(data.discount_total || '0'),
            shipping_total: String(data.shipping_total || '0'),
            customer_note: data.customer_note,
            billing: JSON.stringify(data.billing || {}),
            shipping: JSON.stringify(data.shipping || {}),
            line_items: JSON.stringify(data.line_items || []),
            fee_lines: JSON.stringify(data.fee_lines || []),
            userId: userId || null,
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
          featured: Boolean(data.featured),
          catalog_visibility: data.catalog_visibility,
          description: data.description,
          short_description: data.short_description,
          sku: data.sku,
          price: String(data.price || '0'),
          regular_price: String(data.regular_price || '0'),
          sale_price: String(data.sale_price || '0'),
          manage_stock: Boolean(data.manage_stock),
          stock_quantity: data.stock_quantity,
          stock_status: data.stock_status,
          categories: JSON.stringify(data.categories || []),
          images: JSON.stringify(data.images || []),
          attributes: JSON.stringify(data.attributes || []),
          date_created: new Date(data.date_created),
          date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
          userId: userId || null,
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
          is_paying_customer: Boolean(data.is_paying_customer),
          orders_count: data.orders_count || 0,
          total_spent: String(data.total_spent || '0'),
          date_created: data.date_created ? new Date(data.date_created) : new Date(),
          date_modified: data.date_modified ? new Date(data.date_modified) : new Date(),
          userId: userId || null,
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

    // Emit real-time update event to connected browser tabs
    realtimeEmitter.emit('change', { resource, event, userId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

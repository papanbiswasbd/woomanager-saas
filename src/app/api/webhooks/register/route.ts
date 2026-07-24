import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const TOPICS = [
  'order.created', 'order.updated', 'order.deleted',
  'product.created', 'product.updated', 'product.deleted',
  'customer.created', 'customer.updated', 'customer.deleted'
];

export async function POST(request: Request) {
  try {
    const { baseUrl, storeUrl, consumerKey, consumerSecret } = await request.json(); // e.g. https://your-ngrok.app

    if (!baseUrl) {
      return NextResponse.json({ message: 'Base URL is required to register webhooks.' }, { status: 400 });
    }

    // Auto-heal the DB if keys are sent from frontend
    if (storeUrl && consumerKey && consumerSecret) {
      await db.store.upsert({
        where: { id: 1 },
        update: { url: storeUrl, consumerKey, consumerSecret },
        create: { id: 1, url: storeUrl, consumerKey, consumerSecret }
      });
    }

    const store = await db.store.findUnique({ where: { id: 1 } });
    
    if (!store || !store.url || !store.consumerKey || !store.consumerSecret) {
      return NextResponse.json({ message: 'Store credentials not configured.' }, { status: 400 });
    }

    // Generate a single secret for all webhooks if it doesn't exist
    let webhookSecret = store.webhookSecret;
    if (!webhookSecret) {
      webhookSecret = crypto.randomBytes(32).toString('hex');
      await db.store.update({
        where: { id: 1 },
        data: { webhookSecret }
      });
    }

    const restUrl = store.url.replace(/\/+$/, '');
    const authString = Buffer.from(`${store.consumerKey}:${store.consumerSecret}`).toString('base64');
    const targetUrl = `${restUrl}/wp-json/wc/v3/webhooks`;
    const deliveryUrl = `${baseUrl}/api/webhooks/woo`;

    const results = [];

    // Register all topics
    for (const topic of TOPICS) {
      const payload = {
        name: `SaaS Sync: ${topic}`,
        topic: topic,
        delivery_url: deliveryUrl,
        secret: webhookSecret,
        status: 'active'
      };

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(`Failed to register ${topic}:`, errorData);
        results.push({ topic, status: 'failed', error: errorData.message });
      } else {
        results.push({ topic, status: 'success' });
      }
    }

    const failed = results.filter(r => r.status === 'failed');
    if (failed.length > 0) {
      return NextResponse.json({ 
        message: `Registered some webhooks, but ${failed.length} failed.`, 
        results 
      }, { status: 207 });
    }

    return NextResponse.json({ success: true, message: 'All webhooks registered successfully!' });

  } catch (error: any) {
    console.error("Webhook Registration Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

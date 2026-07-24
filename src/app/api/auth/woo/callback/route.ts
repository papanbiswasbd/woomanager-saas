import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    
    // WooCommerce sends application/x-www-form-urlencoded or application/json
    let data: any = {};
    try {
      data = JSON.parse(body);
    } catch (e) {
      // If not JSON, parse as urlencoded
      const params = new URLSearchParams(body);
      params.forEach((value, key) => {
        data[key] = value;
      });
    }

    const { user_id, consumer_key, consumer_secret } = data;

    if (!user_id || !consumer_key || !consumer_secret) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Save directly to the single-tenant Store DB
    // We assume the frontend passed the URL earlier, but we just update the keys here.
    // If the URL is missing, the frontend will update it via /api/store after callback.
    await db.store.upsert({
      where: { id: 1 },
      update: {
        consumerKey: consumer_key,
        consumerSecret: consumer_secret
      },
      create: {
        id: 1,
        url: '', // Frontend will PATCH this or it was saved before auth redirect
        consumerKey: consumer_key,
        consumerSecret: consumer_secret
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("WooCommerce Auth Callback Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

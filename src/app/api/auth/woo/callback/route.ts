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

    // Search for existing store by user_id or create new store associated with user_id
    const existingStore = await db.store.findFirst({
      where: { userId: user_id }
    });

    if (existingStore) {
      await db.store.update({
        where: { id: existingStore.id },
        data: {
          consumerKey: consumer_key,
          consumerSecret: consumer_secret
        }
      });
    } else {
      await db.store.create({
        data: {
          userId: user_id,
          url: '',
          consumerKey: consumer_key,
          consumerSecret: consumer_secret
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("WooCommerce Auth Callback Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    // Strict user isolation: Search ONLY for store by authenticated userId
    const store = user?.id 
      ? await db.store.findFirst({ where: { userId: user.id } })
      : null;

    if (!store) {
      return NextResponse.json({ url: '', consumerKey: '', consumerSecret: '' });
    }

    return NextResponse.json({
      url: store.url,
      consumerKey: store.consumerKey,
      consumerSecret: store.consumerSecret,
    });
  } catch (error: any) {
    console.error("Fetch Store Settings Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    const body = await request.json();
    const { url, consumerKey, consumerSecret } = body;

    const existingStore = user?.id ? await db.store.findFirst({ where: { userId: user.id } }) : null;

    let store;
    if (existingStore) {
      store = await db.store.update({
        where: { id: existingStore.id },
        data: {
          url: url || '',
          consumerKey: consumerKey || '',
          consumerSecret: consumerSecret || '',
        }
      });
    } else {
      store = await db.store.create({
        data: {
          url: url || '',
          consumerKey: consumerKey || '',
          consumerSecret: consumerSecret || '',
          userId: user?.id || null
        }
      });
    }

    return NextResponse.json({ success: true, store });
  } catch (error: any) {
    console.error("Update Store Settings Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

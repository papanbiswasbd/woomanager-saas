import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const store = await db.store.findUnique({
      where: { id: 1 }
    });

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
    const body = await request.json();
    const { url, consumerKey, consumerSecret } = body;

    const store = await db.store.upsert({
      where: { id: 1 },
      update: {
        url: url || '',
        consumerKey: consumerKey || '',
        consumerSecret: consumerSecret || '',
      },
      create: {
        id: 1,
        url: url || '',
        consumerKey: consumerKey || '',
        consumerSecret: consumerSecret || '',
      }
    });

    return NextResponse.json({ success: true, store });
  } catch (error: any) {
    console.error("Update Store Settings Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

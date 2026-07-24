import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeUrl, consumerKey, consumerSecret } = body;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json({ message: 'Missing credentials' }, { status: 400 });
    }

    const restUrl = storeUrl.replace(/\/+$/, '');
    const targetUrl = `${restUrl}/wp-json/wc/v3/system_status`;

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
      return NextResponse.json({ message: result.message || 'Connection failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, environment: data.environment?.site_name || 'WooCommerce Store' });
  } catch (error: any) {
    console.error("WooCommerce Connection Check Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

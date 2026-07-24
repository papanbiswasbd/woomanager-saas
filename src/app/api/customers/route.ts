import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    const skip = (page - 1) * perPage;

    const [customers, totalCount] = await Promise.all([
      db.customer.findMany({
        orderBy: { date_created: 'desc' },
        skip,
        take: perPage,
      }),
      db.customer.count()
    ]);

    const parsedCustomers = customers.map(customer => ({
      ...customer,
      billing: JSON.parse(customer.billing || '{}'),
      shipping: JSON.parse(customer.shipping || '{}'),
      date_created: customer.date_created.toISOString(),
    }));

    return NextResponse.json({
      customers: parsedCustomers,
      totalCount,
      totalPages: Math.ceil(totalCount / perPage),
      currentPage: page
    });
  } catch (error: any) {
    console.error("Fetch local customers error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

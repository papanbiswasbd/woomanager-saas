import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    const skip = (page - 1) * perPage;
    const where: any = {};
    if (user) {
      where.userId = user.id;
    }

    const [customers, totalCount] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { date_created: 'desc' },
        skip,
        take: perPage,
      }),
      db.customer.count({ where })
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

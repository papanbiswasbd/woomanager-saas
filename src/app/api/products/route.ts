import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    const products = await db.product.findMany({
      orderBy: { date_created: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    const parsedProducts = products.map(product => ({
      ...product,
      categories: JSON.parse(product.categories || '[]'),
      images: JSON.parse(product.images || '[]'),
      attributes: JSON.parse(product.attributes || '[]'),
      date_created: product.date_created.toISOString(),
    }));

    const totalCount = await db.product.count();
    const totalPages = Math.ceil(totalCount / perPage);

    return NextResponse.json({ products: parsedProducts, totalCount, totalPages });
  } catch (error: any) {
    console.error("Fetch local products error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

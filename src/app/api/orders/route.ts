import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(10, parseInt(searchParams.get('per_page') || '50')));
    const status = searchParams.get('status') || 'any';
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const baseWhere: any = {};
    if (user) {
      baseWhere.userId = user.id;
    }
    
    if (from && to) {
      baseWhere.date_created = {
        gte: new Date(from),
        lte: new Date(to)
      };
    }

    if (search) {
      baseWhere.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { billing: { contains: search, mode: 'insensitive' } },
        { shipping: { contains: search, mode: 'insensitive' } },
        { line_items: { contains: search, mode: 'insensitive' } }
      ];
    }

    const where: any = { ...baseWhere };
    if (status !== 'any') {
      where.status = status;
    }

    // Single parallel Promise.all to PostgreSQL for zero sequential round-trips
    const [orders, totalCount, statusCountsData, products] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { date_created: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          number: true,
          status: true,
          date_created: true,
          payment_method_title: true,
          transaction_id: true,
          currency_symbol: true,
          total: true,
          billing: true,
          shipping: true,
          line_items: true,
          fee_lines: true,
        }
      }),
      db.order.count({ where }),
      db.order.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true }
      }),
      db.product.findMany({
        where: baseWhere,
        select: { id: true, images: true }
      })
    ]);

    // Build product image map in memory (0ms)
    const imageMap = new Map<number, string>();
    products.forEach((p: any) => {
      try {
        const images = JSON.parse(p.images || '[]');
        if (images.length > 0 && images[0]?.src) {
          imageMap.set(p.id, images[0].src);
        }
      } catch (e) {}
    });

    // Parse JSON fields
    const parsedOrders = orders.map(order => {
      let lineItems: any[] = [];
      try {
        lineItems = JSON.parse(order.line_items || '[]');
      } catch (e) {}

      lineItems.forEach((item: any) => {
        if (typeof item.image === 'string') {
          item.image = { src: item.image };
        }
        if (!item.image) item.image = {};
        
        const dbSrc = imageMap.get(item.product_id);
        if (dbSrc && !item.image.src) {
          item.image.src = dbSrc;
        }
      });

      return {
        ...order,
        billing: JSON.parse(order.billing || '{}'),
        shipping: JSON.parse(order.shipping || '{}'),
        line_items: lineItems,
        fee_lines: JSON.parse(order.fee_lines || '[]'),
        date_created: order.date_created.toISOString(),
      };
    });

    const totalPages = Math.ceil(totalCount / perPage);

    const statusCounts = statusCountsData.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    statusCounts['any'] = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return NextResponse.json({ orders: parsedOrders, totalCount, totalPages, statusCounts });
  } catch (error: any) {
    console.error("Fetch local orders error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

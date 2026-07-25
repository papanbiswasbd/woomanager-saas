import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');
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
        { number: { contains: search } },
        { billing: { contains: search } },
        { shipping: { contains: search } },
        { line_items: { contains: search } }
      ];
    }

    const where: any = { ...baseWhere };
    if (status !== 'any') {
      where.status = status;
    }

    // Execute queries in PARALLEL in a single network round-trip to PostgreSQL
    const [orders, totalCount, statusCountsData] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { date_created: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.order.count({ where }),
      db.order.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true }
      })
    ]);

    // Parse JSON strings back into objects
    const parsedOrders = orders.map(order => ({
      ...order,
      billing: JSON.parse(order.billing || '{}'),
      shipping: JSON.parse(order.shipping || '{}'),
      line_items: JSON.parse(order.line_items || '[]'),
      fee_lines: JSON.parse(order.fee_lines || '[]'),
      date_created: order.date_created.toISOString(),
    }));

    // Collect product IDs from line items to fetch images
    const productIds = Array.from(new Set(parsedOrders.flatMap((o: any) => o.line_items.map((i: any) => i.product_id)).filter(Boolean)));
    
    if (productIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: productIds as number[] } },
        select: { id: true, images: true }
      });

      const imageMap = new Map();
      products.forEach((p: any) => {
        try {
          const images = JSON.parse(p.images || '[]');
          if (images.length > 0 && images[0].src) {
            imageMap.set(p.id, images[0].src);
          }
        } catch (e) {}
      });

      parsedOrders.forEach((o: any) => {
        o.line_items.forEach((item: any) => {
          if (typeof item.image === 'string') {
            item.image = { src: item.image };
          }
          if (!item.image) item.image = {};
          
          const dbSrc = imageMap.get(item.product_id);
          if (dbSrc && !item.image.src) {
            item.image.src = dbSrc;
          }
        });
      });
    }

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

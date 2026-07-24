import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { subDays, format, isAfter, startOfDay, differenceInDays, addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};
    if (from && to) {
      where.date_created = {
        gte: new Date(from),
        lte: new Date(to)
      };
    }

    // Fetch orders with specific fields to minimize payload
    const allOrders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        total: true,
        date_created: true,
      },
    });

    const totalCustomers = await prisma.customer.count();

    // 1. Key Metrics
    const totalOrders = allOrders.length;
    
    // Calculate Total Revenue (Only completed & processing orders usually count as real revenue)
    const validRevenueStatuses = ['completed', 'processing'];
    const totalRevenue = allOrders
      .filter((order) => validRevenueStatuses.includes(order.status))
      .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);

    // 2. Orders by Status
    const statusCounts: Record<string, number> = {};
    allOrders.forEach((order) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    const ordersByStatus = Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 3. Daily Metrics (Dynamically based on range)
    const startDate = from ? startOfDay(new Date(from)) : startOfDay(subDays(new Date(), 30));
    const endDate = to ? new Date(to) : new Date();
    const daysDiff = differenceInDays(endDate, startDate);
    
    // Pre-fill days to ensure the chart has all dates even if no orders
    const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 0; i <= Math.max(daysDiff, 0); i++) {
      const d = format(addDays(startDate, i), 'MMM dd');
      dailyData[d] = { date: d, revenue: 0, orders: 0 };
    }

    allOrders.forEach((order) => {
      const orderDate = new Date(order.date_created);
      if (isAfter(orderDate, startDate) || format(orderDate, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')) {
        const dayStr = format(orderDate, 'MMM dd');
        if (dailyData[dayStr]) {
          dailyData[dayStr].orders += 1;
          if (validRevenueStatuses.includes(order.status)) {
            dailyData[dayStr].revenue += parseFloat(order.total) || 0;
          }
        }
      }
    });

    const revenueOverTime = Object.values(dailyData);

    // 4. Recent Orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { date_created: 'desc' },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        date_created: true,
        billing: true, // Need this for customer name
        currency_symbol: true,
      }
    });

    // Parse billing to extract name easily on the frontend, avoiding sending raw JSON string
    const parsedRecentOrders = recentOrders.map(order => {
      let customerName = 'Unknown';
      try {
        const billingObj = JSON.parse(order.billing);
        customerName = `${billingObj.first_name || ''} ${billingObj.last_name || ''}`.trim();
      } catch (e) {}
      
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total,
        date_created: order.date_created,
        currency_symbol: order.currency_symbol,
        customerName,
      };
    });

    return NextResponse.json({
      metrics: {
        totalOrders,
        totalRevenue,
        totalCustomers,
      },
      ordersByStatus,
      revenueOverTime,
      recentOrders: parsedRecentOrders,
    });

  } catch (error: any) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

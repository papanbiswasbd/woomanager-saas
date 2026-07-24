'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { DollarSign, ShoppingBag, Users, Package, ArrowUpRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DateFilter } from '@/components/date-filter';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

function DashboardContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        const res = await fetch(`/api/dashboard?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
          <TrendingUp className="h-10 w-10" />
          <p className="font-medium">Loading your metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-destructive">
        Error loading dashboard: {error}
      </div>
    );
  }

  if (!data) return null;

  const { metrics, ordersByStatus, revenueOverTime, recentOrders } = data;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Here is an overview of your store's performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <DateFilter defaultPreset="this_month" />
          <Link 
            href="/orders" 
            className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm gap-2 whitespace-nowrap"
          >
            <ShoppingBag className="h-4 w-4" />
            View All Orders
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-1">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Revenue</h3>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground mt-1">From completed & processing orders</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-1">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Orders</h3>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{metrics.totalOrders.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">All time synced orders</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-1">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Customers</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{metrics.totalCustomers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Unique synced customers</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-7">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:col-span-4">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h3 className="font-semibold leading-none tracking-tight">Revenue Over Time</h3>
            <p className="text-sm text-muted-foreground">Daily revenue for the last 30 days</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueOverTime} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`}
                  width={60}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:col-span-3">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h3 className="font-semibold leading-none tracking-tight">Daily Orders</h3>
            <p className="text-sm text-muted-foreground">Order volume for the last 30 days</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-7">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:col-span-3 flex flex-col">
          <div className="flex flex-col space-y-1.5 pb-2">
            <h3 className="font-semibold leading-none tracking-tight">Order Status Breakdown</h3>
            <p className="text-sm text-muted-foreground">Distribution of all synced orders</p>
          </div>
          <div className="flex-1 h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {ordersByStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ textTransform: 'capitalize' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', textTransform: 'capitalize' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm md:col-span-4 flex flex-col overflow-hidden">
          <div className="flex flex-col space-y-1.5 p-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold leading-none tracking-tight">Recent Orders</h3>
              <Link href="/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">The 5 most recent orders from your store.</p>
          </div>
          <div className="flex-1 overflow-x-auto border-t">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-medium">#{order.number}</div>
                      <div className="text-[11px] text-muted-foreground">{format(new Date(order.date_created), 'MMM d, h:mm a')}</div>
                    </td>
                    <td className="px-6 py-3.5">{order.customerName}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-medium capitalize
                        ${order.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                        ${order.status === 'processing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}
                        ${order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ''}
                        ${order.status === 'pending' || order.status === 'on-hold' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : ''}
                        ${order.status === 'refunded' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400' : ''}
                      `}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium">
                      <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />
                      {parseFloat(order.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No recent orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><TrendingUp className="h-10 w-10 text-muted-foreground animate-pulse" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

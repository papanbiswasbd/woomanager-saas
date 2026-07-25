'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Users, Package, Settings, HelpCircle, Truck, RefreshCcw, BarChart3, Workflow, Bell, UserCircle } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Team', href: '/team', icon: UserCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help Center', href: '/help', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background h-screen sticky top-0 flex flex-col hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b font-semibold text-lg tracking-tight">
        WooManager SaaS
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          WooCommerce Connected
        </div>
      </div>
    </aside>
  );
}

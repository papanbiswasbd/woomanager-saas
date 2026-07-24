import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { GlobalSync } from "@/components/global-sync";
import { AutoSync } from "@/components/auto-sync";

export const metadata: Metadata = {
  title: "WooCommerce Order Manager",
  description: "Direct-connect WooCommerce Order Management SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="h-full flex overflow-hidden bg-muted/20 font-sans text-foreground">
        <QueryProvider>
          <GlobalSync />
          <AutoSync />
          <Sidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

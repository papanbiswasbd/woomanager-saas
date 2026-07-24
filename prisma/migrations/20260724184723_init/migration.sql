-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date_created" DATETIME NOT NULL,
    "payment_method_title" TEXT,
    "transaction_id" TEXT,
    "customer_ip_address" TEXT,
    "currency_symbol" TEXT NOT NULL,
    "total" TEXT NOT NULL,
    "total_tax" TEXT NOT NULL,
    "discount_total" TEXT NOT NULL,
    "shipping_total" TEXT NOT NULL,
    "customer_note" TEXT,
    "billing" TEXT NOT NULL,
    "shipping" TEXT NOT NULL,
    "line_items" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

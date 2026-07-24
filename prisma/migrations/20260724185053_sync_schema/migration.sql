-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT,
    "username" TEXT,
    "billing" TEXT NOT NULL,
    "shipping" TEXT NOT NULL,
    "is_paying_customer" BOOLEAN NOT NULL DEFAULT false,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "total_spent" TEXT NOT NULL DEFAULT '0',
    "date_created" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "catalog_visibility" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "regular_price" TEXT NOT NULL,
    "sale_price" TEXT NOT NULL,
    "manage_stock" BOOLEAN NOT NULL DEFAULT false,
    "stock_quantity" INTEGER,
    "stock_status" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "attributes" TEXT NOT NULL,
    "date_created" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, consumerKey, consumerSecret, page = 1 } = body;

    if (!url || !consumerKey || !consumerSecret) {
      return NextResponse.json({ message: 'Missing required credentials' }, { status: 400 });
    }

    const restUrl = url.replace(/\/+$/, '');
    let targetUrl = `${restUrl}/wp-json/wc/v3/products?per_page=100&page=${page}`;

    // Delta Sync: Check for the latest modified product
    const latestProduct = await db.product.findFirst({
      orderBy: { date_modified: 'desc' }
    });

    if (latestProduct && latestProduct.date_modified) {
      targetUrl += `&modified_after=${latestProduct.date_modified.toISOString()}`;
    }

    const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      const result = await response.json();
      return NextResponse.json({ message: result.message || 'Error fetching from WooCommerce' }, { status: response.status });
    }

    const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1');
    const hasMore = page < totalPages;
    const products = await response.json();

    for (const product of products) {
      const productData = {
        name: product.name,
        slug: product.slug,
        permalink: product.permalink,
        type: product.type,
        status: product.status,
        featured: product.featured,
        catalog_visibility: product.catalog_visibility,
        description: product.description,
        short_description: product.short_description,
        sku: product.sku,
        price: product.price,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        manage_stock: product.manage_stock,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        categories: JSON.stringify(product.categories),
        images: JSON.stringify(product.images),
        attributes: JSON.stringify(product.attributes),
        date_created: new Date(product.date_created),
        date_modified: product.date_modified ? new Date(product.date_modified) : new Date(),
      };

      await db.product.upsert({
        where: { id: product.id },
        update: productData,
        create: {
          id: product.id,
          ...productData
        }
      });
    }

    return NextResponse.json({ success: true, count: products.length, hasMore, totalPages });
  } catch (error: any) {
    console.error("Product Sync Error:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

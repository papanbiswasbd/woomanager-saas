import { Pool } from 'pg';
import 'dotenv/config';

async function fix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const userRes = await pool.query('SELECT id, email, name FROM "User"');
  console.log("Registered users in DB:", userRes.rows);

  if (userRes.rows.length > 0) {
    // Reassign data to the accounts so they can view all existing store orders & products
    for (const user of userRes.rows) {
      console.log(`Assigning database records to user: ${user.name} (${user.email}, ID: ${user.id})...`);

      const orderRes = await pool.query('UPDATE "Order" SET "userId" = $1 WHERE "userId" IS NULL OR "userId" = $1', [user.id]);
      const productRes = await pool.query('UPDATE "Product" SET "userId" = $1 WHERE "userId" IS NULL OR "userId" = $1', [user.id]);
      const customerRes = await pool.query('UPDATE "Customer" SET "userId" = $1 WHERE "userId" IS NULL OR "userId" = $1', [user.id]);
      const storeRes = await pool.query('UPDATE "Store" SET "userId" = $1 WHERE "userId" IS NULL OR "userId" = $1', [user.id]);

      console.log(`✓ Account ${user.email} (ID: ${user.id}) now has ${orderRes.rowCount} orders, ${productRes.rowCount} products, ${customerRes.rowCount} customers, and ${storeRes.rowCount} stores!`);
    }
  } else {
    console.log("No registered users found in DB yet.");
  }

  await pool.end();
}

fix().catch(console.error);

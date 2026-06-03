const { neon } = require('@neondatabase/serverless');

const databaseUrl = "postgresql://neondb_owner:npg_9GqQBP7xlKIX@ep-damp-glade-aqyfbn12-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(databaseUrl);

async function check() {
  try {
    console.log("Fetching orders from Neon PostgreSQL...");
    const orders = await sql`SELECT * FROM orders ORDER BY created_at DESC;`;
    console.log(`Found ${orders.length} orders:`);
    console.log(JSON.stringify(orders, null, 2));

    const orderItems = await sql`SELECT * FROM order_items;`;
    console.log(`\nFound ${orderItems.length} order items:`);
    console.log(JSON.stringify(orderItems, null, 2));
  } catch (error) {
    console.error("Database query failed:", error);
  }
}

check();

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('user_email')?.value;
  const role = cookieStore.get('user_role')?.value;

  // 1. Guard access: Must be logged in as admin
  if (!email || role !== 'admin') {
    redirect('/login');
  }

  let products: any[] = [];
  let orders: any[] = [];
  let orderItems: any[] = [];
  let sellers: any[] = [];

  try {
    // 2. Fetch all products using raw SQL
    products = await sql`
      SELECT 
        sku, 
        name, 
        dimension, 
        base_unit, 
        base_price::float as base_price, 
        stock::float as stock 
      FROM products 
      ORDER BY name;
    `;

    // 3. Fetch all orders (newest first)
    orders = await sql`
      SELECT 
        id, 
        user_email, 
        status, 
        total_price::float as total_price, 
        created_at 
      FROM orders 
      ORDER BY created_at DESC;
    `;

    // 4. Fetch all order line items to display conversions on the dashboard
    orderItems = await sql`
      SELECT 
        id,
        order_id,
        product_name,
        ordered_quantity::float as ordered_quantity,
        ordered_unit,
        converted_quantity::float as converted_quantity,
        base_unit,
        price_per_base_unit::float as price_per_base_unit,
        calculated_price::float as calculated_price
      FROM order_items;
    `;

    // 5. Fetch all registered sellers
    sellers = await sql`
      SELECT email, role 
      FROM users 
      WHERE role = 'seller' 
      ORDER BY email;
    `;
  } catch (error) {
    console.error('Failed to load admin data:', error);
  }

  return (
    <AdminPanel 
      initialProducts={products} 
      initialOrders={orders} 
      initialOrderItems={orderItems} 
      initialSellers={sellers}
      userEmail={email}
    />
  );
}

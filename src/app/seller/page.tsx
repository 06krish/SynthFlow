import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import SellerCatalog from './SellerCatalog';

export const dynamic = 'force-dynamic';

export default async function SellerPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('user_email')?.value;
  const role = cookieStore.get('user_role')?.value;

  // 1. Guard page access: Must be logged in
  if (!email) {
    redirect('/login');
  }

  let products: any[] = [];
  let orders: any[] = [];
  let orderItems: any[] = [];

  try {
    // 2. Fetch products using raw SQL
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

    // 3. Fetch orders submitted by this seller only
    orders = await sql`
      SELECT 
        id, 
        user_email, 
        status, 
        total_price::float as total_price, 
        created_at 
      FROM orders 
      WHERE user_email = ${email}
      ORDER BY created_at DESC;
    `;

    // 4. Fetch order items for this seller's orders only
    orderItems = await sql`
      SELECT 
        oi.id,
        oi.order_id,
        oi.product_name,
        oi.ordered_quantity::float as ordered_quantity,
        oi.ordered_unit,
        oi.converted_quantity::float as converted_quantity,
        oi.base_unit,
        oi.price_per_base_unit::float as price_per_base_unit,
        oi.calculated_price::float as calculated_price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_email = ${email};
    `;
  } catch (error) {
    console.error('Failed to load products/orders from database:', error);
  }

  return (
    <SellerCatalog 
      initialProducts={products} 
      initialOrders={orders}
      initialOrderItems={orderItems}
      userEmail={email} 
      userRole={role || 'seller'} 
    />
  );
}

'use server';

import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Ensures that the current user is logged in as an Admin.
 */
async function checkAdminAccess() {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (role !== 'admin') {
    throw new Error('Access denied. Admin privileges required.');
  }
}

/**
 * Server Action to add a new product.
 */
export async function addProductAction(formData: FormData) {
  try {
    await checkAdminAccess();

    const sku = (formData.get('sku') as string).trim().toUpperCase();
    const name = (formData.get('name') as string).trim();
    const dimension = formData.get('dimension') as string;
    const baseUnit = formData.get('base_unit') as string;
    const basePrice = parseFloat(formData.get('base_price') as string);
    const stock = parseFloat(formData.get('stock') as string);

    if (!sku || !name || !dimension || !baseUnit || isNaN(basePrice) || isNaN(stock)) {
      return { error: 'All fields are required and must be valid numbers.' };
    }

    // Insert into products table
    await sql`
      INSERT INTO products (sku, name, dimension, base_unit, base_price, stock)
      VALUES (${sku}, ${name}, ${dimension}, ${baseUnit}, ${basePrice}, ${stock});
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to add product:', error);
    if (error.message?.includes('primary key') || error.message?.includes('unique constraint')) {
      return { error: 'A product with this SKU already exists.' };
    }
    return { error: error.message || 'Failed to add product.' };
  }
}

/**
 * Server Action to update a product's price and stock.
 */
export async function updateProductAction(sku: string, basePrice: number, stock: number) {
  try {
    await checkAdminAccess();

    if (isNaN(basePrice) || isNaN(stock)) {
      return { error: 'Price and stock must be valid numbers.' };
    }

    await sql`
      UPDATE products 
      SET base_price = ${basePrice}, stock = ${stock}
      WHERE sku = ${sku};
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update product:', error);
    return { error: error.message || 'Failed to update product.' };
  }
}

/**
 * Server Action to delete a product.
 */
export async function deleteProductAction(sku: string) {
  try {
    await checkAdminAccess();

    await sql`
      DELETE FROM products WHERE sku = ${sku};
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return { error: error.message || 'Failed to delete product.' };
  }
}

/**
 * Server Action to approve or reject a pending order.
 * If approved, stock levels are subtracted.
 */
export async function updateOrderStatusAction(orderId: string, status: 'approved' | 'rejected') {
  try {
    await checkAdminAccess();

    // 1. Verify the order exists and is pending
    const orders = await sql`
      SELECT * FROM orders WHERE id = ${orderId} LIMIT 1;
    `;
    const order = orders[0];

    if (!order) {
      return { error: 'Order not found.' };
    }

    if (order.status !== 'pending') {
      return { error: `Order has already been ${order.status}.` };
    }

    if (status === 'rejected') {
      // Direct reject is simple: just change status in DB
      await sql`
        UPDATE orders SET status = 'rejected' WHERE id = ${orderId};
      `;
    } else if (status === 'approved') {
      // 2. Approve requires checking and updating inventory
      // Fetch all items inside the order
      const items = await sql`
        SELECT * FROM order_items WHERE order_id = ${orderId};
      `;

      // Pre-check: Verify stock is available for ALL items first
      for (const item of items) {
        const products = await sql`
          SELECT sku, name, stock FROM products WHERE name = ${item.product_name} LIMIT 1;
        `;
        const product = products[0];

        if (!product) {
          return { error: `Stock check failed: Product "${item.product_name}" is no longer in the catalog.` };
        }

        const currentStock = parseFloat(product.stock);
        const neededStock = parseFloat(item.converted_quantity);

        if (currentStock < neededStock) {
          return { 
            error: `Insufficient stock for "${item.product_name}". Needed: ${neededStock.toFixed(2)}, Available: ${currentStock.toFixed(2)}` 
          };
        }
      }

      // Action: Subtract inventory and approve
      for (const item of items) {
        await sql`
          UPDATE products 
          SET stock = stock - ${parseFloat(item.converted_quantity)} 
          WHERE name = ${item.product_name};
        `;
      }

      await sql`
        UPDATE orders SET status = 'approved' WHERE id = ${orderId};
      `;
    }

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    return { error: error.message || 'Failed to update order status.' };
  }
}

/**
 * Server Action to add a new seller user.
 */
export async function addSellerAction(email: string, password: string) {
  try {
    await checkAdminAccess();

    if (!email || !password) {
      return { error: 'Both email and password are required.' };
    }

    await sql`
      INSERT INTO users (email, password, role)
      VALUES (${email}, ${password}, 'seller');
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to add seller:', error);
    if (error.message?.includes('primary key') || error.message?.includes('unique constraint')) {
      return { error: 'A user with this email already exists.' };
    }
    return { error: error.message || 'Failed to add seller.' };
  }
}

/**
 * Server Action to delete a seller user.
 */
export async function deleteSellerAction(email: string) {
  try {
    await checkAdminAccess();

    if (email === 'admin@company.com') {
      return { error: 'Cannot delete the master admin account.' };
    }

    await sql`
      DELETE FROM users WHERE email = ${email};
    `;

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete seller:', error);
    return { error: error.message || 'Failed to delete seller.' };
  }
}

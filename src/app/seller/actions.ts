'use server';

import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { convertQuantity, calculateItemPrice } from '@/lib/conversion';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

interface CartItemInput {
  sku: string;
  orderedQty: number;
  orderedUnit: string;
}

/**
 * Server Action to place a quotation/order.
 * It calculates prices securely on the server to prevent user tampering.
 */
export async function placeOrderAction(items: CartItemInput[]) {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('user_email')?.value;

  // 1. Ensure user is logged in
  if (!userEmail) {
    return { error: 'You must be logged in to place an order.' };
  }

  if (!items || items.length === 0) {
    return { error: 'Your cart is empty. Please add items before submitting.' };
  }

  try {
    // 2. Generate a unique ID for the order
    const orderId = randomUUID();

    let totalOrderPrice = 0;
    const itemsToInsert = [];

    // 3. Process each cart item, fetch product info, and calculate conversions securely
    for (const item of items) {
      const products = await sql`
        SELECT * FROM products WHERE sku = ${item.sku} LIMIT 1;
      `;
      const product = products[0];

      if (!product) {
        return { error: `Product with SKU ${item.sku} was not found in the catalog.` };
      }

      const basePrice = parseFloat(product.base_price);
      const baseUnit = product.base_unit;

      // Calculate conversions and subtotal
      const convertedQty = convertQuantity(item.orderedQty, item.orderedUnit, baseUnit);
      const calculatedPrice = calculateItemPrice(item.orderedQty, item.orderedUnit, baseUnit, basePrice);

      totalOrderPrice += calculatedPrice;

      itemsToInsert.push({
        order_id: orderId,
        product_name: product.name,
        ordered_quantity: item.orderedQty,
        ordered_unit: item.orderedUnit,
        converted_quantity: convertedQty,
        base_unit: baseUnit,
        price_per_base_unit: basePrice,
        calculated_price: calculatedPrice
      });
    }

    // 4. Save the order to the 'orders' table
    await sql`
      INSERT INTO orders (id, user_email, status, total_price)
      VALUES (${orderId}, ${userEmail}, 'pending', ${totalOrderPrice});
    `;

    // 5. Save all items to 'order_items' table
    for (const line of itemsToInsert) {
      await sql`
        INSERT INTO order_items (
          order_id, 
          product_name, 
          ordered_quantity, 
          ordered_unit, 
          converted_quantity, 
          base_unit, 
          price_per_base_unit, 
          calculated_price
        )
        VALUES (
          ${line.order_id}, 
          ${line.product_name}, 
          ${line.ordered_quantity}, 
          ${line.ordered_unit}, 
          ${line.converted_quantity}, 
          ${line.base_unit}, 
          ${line.price_per_base_unit}, 
          ${line.calculated_price}
        );
      `;
    }

    revalidatePath('/admin');
    revalidatePath('/seller');
    return { success: true, orderId };
  } catch (error: any) {
    console.error('Order saving error:', error);
    return { error: 'Failed to place the order: ' + (error.message || error) };
  }
}

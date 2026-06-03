import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // 1. Create the 'users' table
    // It stores the login email, plain-text password, and role ('admin' or 'seller')
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(100) PRIMARY KEY,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL
      );
    `;

    // 2. Create the 'products' table
    // It stores chemical or item details including the base unit and base price
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        sku VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        dimension VARCHAR(20) NOT NULL, -- 'weight', 'volume', or 'count'
        base_unit VARCHAR(10) NOT NULL,  -- 'kg', 'g', 'L', 'mL', or 'item'
        base_price NUMERIC(20, 8) NOT NULL, -- Price per base unit in INR
        stock NUMERIC(20, 8) NOT NULL       -- Current inventory quantity
      );
    `;

    // 3. Create the 'orders' table
    // It tracks individual orders/quotations placed by sellers
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        user_email VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL, -- 'pending', 'approved', or 'rejected'
        total_price NUMERIC(20, 8) NOT NULL, -- Subtotal sum in INR
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 4. Create the 'order_items' table
    // It stores the line items for each order, saving both user-entered units and converted values
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id UUID NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        ordered_quantity NUMERIC(20, 8) NOT NULL, -- e.g., 500
        ordered_unit VARCHAR(10) NOT NULL,        -- e.g., 'g'
        converted_quantity NUMERIC(20, 8) NOT NULL, -- e.g., 0.5
        base_unit VARCHAR(10) NOT NULL,          -- e.g., 'kg'
        price_per_base_unit NUMERIC(20, 8) NOT NULL, -- Price rate (e.g. 250.00 INR/kg)
        calculated_price NUMERIC(20, 8) NOT NULL  -- Subtotal (e.g. 125.00 INR)
      );
    `;

    // 5. Insert initial test accounts (Seed Data)
    // Insert the Admin account
    await sql`
      INSERT INTO users (email, password, role)
      VALUES ('krishraj.suj38@gmail.com', '3406@Krish', 'admin')
      ON CONFLICT (email) DO UPDATE SET password = '3406@Krish';
    `;
    // Insert the Seller accounts
    await sql`
      INSERT INTO users (email, password, role)
      VALUES ('seller@company.com', 'seller123', 'seller')
      ON CONFLICT (email) DO NOTHING;
    `;
    await sql`
      INSERT INTO users (email, password, role)
      VALUES ('seller2@company.com', 'seller123', 'seller')
      ON CONFLICT (email) DO NOTHING;
    `;

    // 6. Insert initial catalog products (only if the products table is empty)
    const productCountRes = await sql`SELECT COUNT(*) FROM products;`;
    const count = parseInt(productCountRes[0].count, 10);

    if (count === 0) {
      await sql`
        INSERT INTO products (sku, name, dimension, base_unit, base_price, stock)
        VALUES 
          ('CHEM-001', 'Sodium Chloride (Salt)', 'weight', 'kg', 250.00, 100.0),
          ('CHEM-002', 'Ethanol (Pure Alcohol)', 'volume', 'L', 1200.00, 50.0),
          ('CHEM-003', 'Hydrochloric Acid', 'volume', 'mL', 1.50, 10000.0),
          ('CHEM-004', 'Safety Gloves (Nitrile)', 'count', 'item', 150.00, 200.0),
          ('CHEM-005', 'Glass Beaker (500ml)', 'count', 'item', 450.00, 45.0);
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Database tables created and seeded successfully!',
      credentials: {
        admin: { email: 'krishraj.suj38@gmail.com', password: '3406@Krish' },
        seller: { email: 'seller@company.com', password: 'seller123' }
      }
    });
  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to set up the database tables.',
        error: error.message || error
      },
      { status: 500 }
    );
  }
}

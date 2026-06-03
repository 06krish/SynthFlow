# AasaMedChem Inventory & Order Management System

Welcome to the **AasaMedChem Stock & Order Management Portal**. This application is a lightweight, responsive, and rookie-friendly Next.js web portal designed to manage chemical products, perform precise unit conversions in real-time, and manage submitted order quotations.

---

## 1. High-Level System Design & Tech Stack

This app is built using a clean, simple architecture so that anyone can read the code and understand how it works:

```
[Browser Client]
       │
       ▼ (Submits forms / Server Actions)
[Next.js Server (App Router & Middleware)]
       │
       ▼ (Plain SQL Queries)
[Neon serverless cloud database (PostgreSQL)]
```

### Technologies Used:
- **Framework**: Next.js 15 (App Router with Server Actions & Middleware)
- **Database Client**: `@neondatabase/serverless` (Runs raw SQL queries directly on Neon)
- **Database**: Neon Serverless Cloud PostgreSQL
- **Styling**: Tailwind CSS (Dark Mode with Emerald glows, responsive tables, and card views)
- **Session Tracking**: Plain-text HTTP-only cookies (`user_email` and `user_role`)

---

## 2. Database Schema & Data Types

We chose PostgreSQL `NUMERIC(20, 8)` for all price and quantity fields:
- *Why not floating-point?* Standard float types (`REAL` or `DOUBLE PRECISION`) suffer from binary rounding errors (e.g., `0.1 + 0.2` becomes `0.30000000000000004`). In inventory systems and order invoicing, this is unacceptable.
- *Why `NUMERIC(20, 8)`?* It stores up to 20 digits, with exactly 8 decimal places. This allows us to track tiny fractions (e.g., milliliters or grams of a highly concentrated active ingredient) with absolute mathematical accuracy.

### Tables Overview:
1. **`users`**:
   - `email` (VARCHAR(100), Primary Key): User's identifier.
   - `password` (VARCHAR(100)): Plain text password (simple for learning).
   - `role` (VARCHAR(20)): User's role (`'admin'` or `'seller'`).

2. **`products`**:
   - `sku` (VARCHAR(50), Primary Key): Unique chemical code (e.g., `CHEM-001`).
   - `name` (VARCHAR(100)): Product name.
   - `dimension` (VARCHAR(20)): `weight`, `volume`, or `count`.
   - `base_unit` (VARCHAR(10)): Default stocking unit (`kg`, `g`, `L`, `mL`, or `item`).
   - `base_price` (NUMERIC(20, 8)): Price in INR per exactly 1 base unit.
   - `stock` (NUMERIC(20, 8)): Quantity of stock left, measured in the `base_unit`.

3. **`orders`**:
   - `id` (UUID, Primary Key): Unique order code.
   - `user_email` (VARCHAR(100)): Seller who submitted the quotation.
   - `status` (VARCHAR(20)): `'pending'`, `'approved'`, or `'rejected'`.
   - `total_price` (NUMERIC(20, 8)): Grand total price in INR.
   - `created_at` (TIMESTAMP): Date and time of order.

4. **`order_items`**:
   - `id` (SERIAL, Primary Key): Unique row identifier.
   - `order_id` (UUID): Reference to the order.
   - `product_name` (VARCHAR(100)): Name of the product at order time.
   - `ordered_quantity` (NUMERIC(20, 8)): Quantity typed by the seller.
   - `ordered_unit` (VARCHAR(10)): Unit chosen by the seller.
   - `converted_quantity` (NUMERIC(20, 8)): Equivalent quantity in the product's base unit.
   - `base_unit` (VARCHAR(10)): Product's pricing unit.
   - `price_per_base_unit` (NUMERIC(20, 8)): Pricing rate at order time.
   - `calculated_price` (NUMERIC(20, 8)): Item subtotal in INR.

---

## 3. Unit Storage & Conversion Strategy

To convert quantities cleanly between compatible units, we map each unit to a reference factor:

| Dimension | Unit | Factor Relative to Base | Absolute Base Unit |
| :--- | :--- | :--- | :--- |
| **weight** | `g` | 1 | grams |
| **weight** | `kg` | 1000 | grams |
| **volume** | `mL` | 1 | milliliters |
| **volume** | `L` | 1000 | milliliters |
| **count** | `item`| 1 | items |

### Conversion Formulas:
1. **Quantity Conversion**:
   $$\text{Converted Quantity} = \text{Amount} \times \frac{\text{factor of fromUnit}}{\text{factor of toUnit}}$$
   *Example (Converting 250 g to kg):*
   $$250 \times \frac{1}{1000} = 0.25\text{ kg}$$

2. **Price Subtotal Calculation**:
   If a product is priced at $P$ INR per its `base_unit` (e.g. $400\text{ INR/kg}$), and a user orders quantity $Q$ in unit $A$ (e.g. $250\text{ g}$):
   - Step A: Convert quantity to base unit: $Q_{\text{base}} = 0.25\text{ kg}$.
   - Step B: Subtotal = $Q_{\text{base}} \times P = 0.25 \times 400 = 100.00\text{ INR}$.

*All conversions are processed instantly in the browser for the UI display, and re-calculated securely on the server side prior to saving in the database.*

---

## 4. Setup & Installation Guide

Follow these steps to run the application locally on your computer:

### Step 1: Set up Environment Variables
1. Find the `.env.local` file in the root of the project.
2. Ensure your Neon connection string is inserted there:
   ```env
   DATABASE_URL=postgresql://neondb_owner:npg_9GqQBP7xlKIX@ep-damp-glade-aqyfbn12.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Install Packages
In your terminal, run the following command to download dependencies:
```bash
npm install
```

### Step 3: Run the Development Server
Start the local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Setup & Seed the Database Tables
1. Ensure your development server is running.
2. In your browser, navigate to: [http://localhost:3000/api/setup](http://localhost:3000/api/setup)
3. The page will run the SQL scripts and show a success message: `"Database tables created and seeded successfully!"`.
4. *Your database is now fully prepared!*

---

## 5. How to Log In & Test the Application

Use these pre-seeded credentials to explore the system:

| Role | Username / Email | Password | Allowed Dashboards |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@company.com` | `admin123` | `/admin` and `/seller` |
| **Seller** | `seller@company.com` | `seller123` | `/seller` (Redirected if opening `/admin`) |

### Test Drive Flow:
1. **Log in as a Seller** (`seller@company.com`):
   - Choose a product (e.g., Sodium Chloride).
   - Enter quantity `500` and select unit `g`. Note that the screen dynamically displays:
     - Converted quantity: `0.50000000 kg`
     - Live item subtotal: `125.00 INR`
   - Click **➕ Add to Order List**.
   - Click **Submit Quotation**.

2. **Log in as an Admin** (`admin@company.com`):
   - Switch to the **Quotations & Orders** tab.
   - Click the submitted order to expand it. You will see:
     - The product name, ordered unit (`500 g`), converted unit (`0.5 kg`), pricing rate (`250.00 INR/kg`), and item subtotal (`125.00 INR`).
   - Click **Approve Order**.
   - Navigate to the **Inventory Products** tab. You will see that the stock level for Sodium Chloride has successfully dropped from `100.00 kg` to `99.50 kg`.

---

## 6. How to Deploy on Vercel

To deploy your application live to the web:
1. Push your code to a GitHub repository.
2. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Select your repository.
4. Under **Environment Variables**, add:
   - Key: `DATABASE_URL`
   - Value: `postgresql://neondb_owner:npg_9GqQBP7xlKIX@ep-damp-glade-aqyfbn12.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`
5. Click **Deploy**.
6. Once deployed, open your live URL (e.g., `https://your-app.vercel.app/api/setup`) once to run the table setup in your production database.

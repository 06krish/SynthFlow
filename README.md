# SynthFlow - High-Precision Inventory & Order Management System

Welcome to **SynthFlow**. This application is a lightweight, responsive, and developer-friendly Next.js web portal designed to manage chemical inventories, perform precise unit conversions in real-time, isolate multi-seller transactions, and resolve order quotations with automatic stock deductions.

---

## 1. Project Overview & Features

SynthFlow is a B2B chemical distribution and order portal that solves the challenge of managing inventory across incompatible physical units (weight, volume, and count).

### Key Features:
- **Interactive Landing Page (`/`)**: Features a modern navbar and a live conversion widget to test the translation between weights, volumes, and counts.
- **Slick Interactive Order Builder**: Sellers can select items and use a live calculator to see unit conversions and subtotal calculations instantly as they type.
- **Incremental Cart & Quotation Submission**: Sellers compile cart line items and submit them as a single order quotation.
- **Multi-Seller Isolation**: Account isolation ensures sellers (e.g., `seller@company.com` vs. `seller2@company.com`) only view their own order logs.
- **Full Admin Control Panel**: Admins can edit pricing and stock levels, manage registered seller accounts (Add/Delete), and review incoming orders.
- **One-Click Order Resolution**: Admins approve or reject pending orders. Approving an order automatically verifies stock availability and deducts inventory in real-time.
- **Frictionless Login Pre-filling**: Shortcuts on the landing page pre-fill credentials for testing both roles.

---

## 2. Tech Stack & High-Level System Design

SynthFlow is built with a clean, decoupled architecture:

```
                  ┌──────────────────────────────────────────────┐
                  │               BROWSER CLIENT                 │
                  │   - LandingPageClient (Interactive Calc)    │
                  │   - SellerCatalog (Cart & History)           │
                  │   - AdminPanel (CRUD & Resolutions)          │
                  └──────────────────────┬───────────────────────┘
                                         │
                   Submits Forms / calls │ Server Actions (RPC)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             NEXT.JS APP SERVER               │
                  │   - Edge Middleware (Protected Routing)      │
                  │   - Server Actions (Secure Calculations)     │
                  │   - Session Cookies (user_email, user_role)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                            Raw SQL over │ Serverless TCP
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            NEON CLOUD DATABASE               │
                  │   - PostgreSQL Database Instance             │
                  │   - High Precision NUMERIC(20,8) Fields      │
                  └──────────────────────────────────────────────┘
```

### Components Interaction:
1. **Frontend (Next.js Client Components)**: Renders the dark-themed user interface, manages client states (like cart additions), performs immediate UI-level calculations, and sends requests to the server.
2. **Backend (Next.js Server Actions & Middleware)**:
   - **Middleware**: Intercepts requests to `/admin` and `/seller`. It reads plain-text cookies (`user_email`, `user_role`) to protect route access without expensive session roundtrips.
   - **Server Actions**: Expose secure RPC methods. When a seller submits an order, the server re-fetches product price rates directly from the database and recalculates conversions to prevent price/quantity tampering on the client side.
3. **Database (Neon Cloud PostgreSQL)**: Stores users, products, orders, and line items. The server queries Neon using the serverless driver (`@neondatabase/serverless`) for quick connection times.

---

## 3. Database Schema & Data Types

Below is the database schema with explicit data types and fields:

### A. `users` Table
Stores user accounts, passwords, and roles:
- `email` (`VARCHAR(100)` PRIMARY KEY): User's login identifier.
- `password` (`VARCHAR(100)` NOT NULL): Plain text password.
- `role` (`VARCHAR(20)` NOT NULL): Role for page access controls (`'admin'` or `'seller'`).

### B. `products` Table
Stores the master product catalog, prices, and stock levels:
- `sku` (`VARCHAR(50)` PRIMARY KEY): Unique product identifier code (e.g., `CHEM-001`).
- `name` (`VARCHAR(100)` NOT NULL): Product name.
- `dimension` (`VARCHAR(20)` NOT NULL): Dimensional category (`'weight'`, `'volume'`, or `'count'`).
- `base_unit` (`VARCHAR(10)` NOT NULL): The unit that inventory is stocked in (`'kg'`, `'g'`, `'L'`, `'mL'`, or `'item'`).
- `base_price` (`NUMERIC(20, 8)` NOT NULL): Pricing rate in INR per exactly 1 base unit.
- `stock` (`NUMERIC(20, 8)` NOT NULL): Available stock level measured in the `base_unit`.

### C. `orders` Table
Tracks quotation submissions:
- `id` (`UUID` PRIMARY KEY): Unique transaction identifier.
- `user_email` (`VARCHAR(100)` NOT NULL): The seller who submitted the order.
- `status` (`VARCHAR(20)` NOT NULL): Current workflow state (`'pending'`, `'approved'`, or `'rejected'`).
- `total_price` (`NUMERIC(20, 8)` NOT NULL): Sum total price of all items in INR.
- `created_at` (`TIMESTAMP` DEFAULT `NOW()`): Date and time the order was placed.

### D. `order_items` Table
Stores individual line items under an order:
- `id` (`SERIAL` PRIMARY KEY): Unique row auto-increment ID.
- `order_id` (`UUID` NOT NULL): Reference to the parent order.
- `product_name` (`VARCHAR(100)` NOT NULL): Product name at transaction time.
- `ordered_quantity` (`NUMERIC(20, 8)` NOT NULL): Quantity input by the seller.
- `ordered_unit` (`VARCHAR(10)` NOT NULL): Unit selected by the seller.
- `converted_quantity` (`NUMERIC(20, 8)` NOT NULL): The ordered quantity converted to the product's base unit.
- `base_unit` (`VARCHAR(10)` NOT NULL): The product's base pricing unit.
- `price_per_base_unit` (`NUMERIC(20, 8)` NOT NULL): Pricing rate at transaction time.
- `calculated_price` (`NUMERIC(20, 8)` NOT NULL): Item subtotal in INR.

---

## 4. Precision, Unit Storage & Conversion Strategy

### Data Type & Precision Rules:
To avoid floating-point rounding errors (e.g., binary representation inaccuracies like `0.1 + 0.2 = 0.30000000000000004`), SynthFlow uses the **`NUMERIC(20, 8)`** data type for all currency and quantity measurements.
- **Precision**: 20 digits (total maximum digits stored).
- **Scale**: 8 digits (fixed number of digits kept after the decimal point).
- **Rounding Rules**:
  - **Database Level**: Values are stored with full 8-decimal accuracy.
  - **Application Logic**: No intermediary rounding is applied during conversions to keep calculations lossless.
  - **UI Presentation**: Currency fields are rendered to 2 decimal places (`.toFixed(2)`), and quantities display up to 8 decimal places with trailing zeros stripped for readability.

### Unit Conversion Strategy:
Units are categorized by dimension and assigned a scaling factor relative to the absolute base unit of that dimension:

| Dimension | Unit | Factor (Relative to Base) | Absolute Base Unit |
| :--- | :--- | :--- | :--- |
| **Weight** | `g` | 1 | grams |
| **Weight** | `kg` | 1000 | grams |
| **Volume** | `mL` | 1 | milliliters |
| **Volume** | `L` | 1000 | milliliters |
| **Count** | `item`| 1 | items |

### Conversion Mathematics:
1. **Quantity Conversion Formula**:
   $$\text{Converted Quantity} = \text{Amount} \times \frac{\text{factor of fromUnit}}{\text{factor of toUnit}}$$
   *Example: Converting 500 grams (g) to kilograms (kg):*
   $$\text{Converted Quantity} = 500 \times \frac{1}{1000} = 0.50000000\text{ kg}$$

2. **Price Subtotal Calculation**:
   $$\text{Subtotal Price (INR)} = \text{Converted Quantity (in base\_unit)} \times \text{Base Price Rate (per base\_unit)}$$
   *Example: Ordering 250 mL of an item priced at 1200 INR per Liter (L):*
   - Step 1 (Convert to base unit `L`): $250 \times \frac{1}{1000} = 0.25\text{ L}$.
   - Step 2 (Calculate subtotal): $0.25\text{ L} \times 1200\text{ INR/L} = 300.00\text{ INR}$.

---

## 5. Development Workflow & Secrets Protection

### GitHub & Commit Strategy:
- **Incremental Commits**: Development follows a disciplined git workflow. Changes are split into logical, incremental commits (e.g., seeding updates, authentication logic, layout structures, and bug fixes) rather than a single massive "final" commit.
- **Secrets Isolation**:
  - Databases connection strings and server secrets are kept out of the codebase.
  - All credentials are loaded through the **`DATABASE_URL`** environment variable.
  - The `.env.local` configuration is explicitly included in the **`.gitignore`** file to prevent accidental pushes to public git history.

---

## 6. Setup & Installation Guide (Local & Neon)

Follow these instructions to configure and run the project:

### Step 1: Set up Local Environment Settings
1. Create a file named `.env.local` in the root of the project.
2. Insert your Neon cloud connection string and the auth secret:
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_9GqQBP7xlKIX@ep-damp-glade-aqyfbn12-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
   NEXTAUTH_SECRET="secret123"
   NEXTAUTH_URL="http://localhost:3000"
   ```

### Step 2: Install Dependencies
Download the project dependencies by running:
```bash
npm install
```

### Step 3: Launch Development Server
Start the Next.js local server:
```bash
npm run dev
```
By default, the server runs on [http://localhost:3000](http://localhost:3000).

### Step 4: Setup & Seed Database Tables
1. Open your browser and navigate to: [http://localhost:3000/api/setup](http://localhost:3000/api/setup).
2. The route will run migrations, create tables (`users`, `products`, `orders`, `order_items`), and seed test data.
3. Once completed, a confirmation JSON response will display on the screen.

---

## 7. How to Log In & Use the App

### Test Drive Credentials:
- **Admin**: `admin@company.com` / `admin123`
- **Seller**: `seller@company.com` / `seller123`

### Walkthrough of the Order Flow:
1. **Landing Page (`/`)**:
   - Scroll down to the **Live Calculator Widget** and enter values (e.g., convert `1.5 L` to `mL`) to see the conversion engine.
   - Click **Seller Login** in the upper-right corner. The form fields will automatically pre-fill with the seller test credentials. Click **Sign In**.
2. **Placing an Order (Seller Portal)**:
   - Select **Sodium Chloride (Salt)** from the Product Catalog.
   - In the **Interactive Order Builder**, type `500` and select unit `g`. Check the Live Mathematics Preview:
     - Conversion: `500 g ➔ 0.50000000 kg`
     - Price Subtotal: `125.00 INR`
   - Click **➕ Add to Order List**. The item is added to the cart.
   - Click **Submit Quotation**. The order will be submitted, and you will be switched to the **My Orders** history tab, showing the order as `pending`.
   - Click **Logout** at the top right.
3. **Approving an Order (Admin Portal)**:
   - Click **Admin Login** in the upper-right corner of the landing page. The fields will pre-fill with the admin credentials. Click **Sign In**.
   - Go to the **Quotations & Orders** tab.
   - Click on the new pending order to expand it. Verify that the line items and calculations match.
   - Click **Approve Order**.
   - Navigate to the **Inventory Products** tab. You will see that the stock level for Sodium Chloride has dropped from `100.00 kg` to `99.50 kg`.

---

## 8. Deployment and Re-deployment to Vercel

### Initial Deployment:
1. Push your project commits to your GitHub repository.
2. Open the [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Import your repository.
4. Under **Environment Variables**, add the keys:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `NEXTAUTH_SECRET`: A secure random secret string.
   - `NEXTAUTH_URL`: Your deployed Vercel domain URL.
5. Click **Deploy**.
6. Visit your deployed URL at `/api/setup` once to create the tables in your production database.

### Re-deployment:
- Vercel automatically deploys updates whenever you push commits to your `main` or `master` branch.
- To trigger a manual build, go to **Deployments** on Vercel, select the latest deployment, click the three dots, and select **Redeploy**.

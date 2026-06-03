'use client';

import React, { useState } from 'react';
import { logoutAction } from '@/lib/auth';
import {
  addProductAction,
  updateProductAction,
  deleteProductAction,
  updateOrderStatusAction,
  addSellerAction,
  deleteSellerAction
} from './actions';

interface Product {
  sku: string;
  name: string;
  dimension: string;
  base_unit: string;
  base_price: number;
  stock: number;
}

interface Order {
  id: string;
  user_email: string;
  status: string;
  total_price: number;
  created_at: Date;
}

interface OrderItem {
  id: number;
  order_id: string;
  product_name: string;
  ordered_quantity: number;
  ordered_unit: string;
  converted_quantity: number;
  base_unit: string;
  price_per_base_unit: number;
  calculated_price: number;
}

interface User {
  email: string;
  role: string;
}

interface AdminPanelProps {
  initialProducts: Product[];
  initialOrders: Order[];
  initialOrderItems: OrderItem[];
  initialSellers: User[];
  userEmail: string;
}

export default function AdminPanel({
  initialProducts,
  initialOrders,
  initialOrderItems,
  initialSellers,
  userEmail
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'sellers'>('products');

  // Core data states (synced to UI)
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems);
  const [sellers, setSellers] = useState<User[]>(initialSellers);

  // Global messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for adding new product
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newDimension, setNewDimension] = useState('weight');
  const [newBaseUnit, setNewBaseUnit] = useState('kg');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form states for adding new seller
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPassword, setNewSellerPassword] = useState('');
  const [isAddingSeller, setIsAddingSeller] = useState(false);

  // States for inline product editing
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Expanded orders tracker (for viewing detail items)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isResolvingOrder, setIsResolvingOrder] = useState(false);

  // Auto-select unit based on dimension choice in Add Form
  function handleDimensionChange(dimension: string) {
    setNewDimension(dimension);
    if (dimension === 'weight') setNewBaseUnit('kg');
    else if (dimension === 'volume') setNewBaseUnit('L');
    else setNewBaseUnit('item');
  }

  // Handle adding a product
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAdding(true);

    const formData = new FormData();
    formData.append('sku', newSku);
    formData.append('name', newName);
    formData.append('dimension', newDimension);
    formData.append('base_unit', newBaseUnit);
    formData.append('base_price', newBasePrice);
    formData.append('stock', newStock);

    const res = await addProductAction(formData);

    if (res.error) {
      setErrorMessage(res.error);
      setIsAdding(false);
    } else {
      setSuccessMessage(`Product "${newName}" added successfully!`);
      // Update local state list
      const newProduct: Product = {
        sku: newSku.trim().toUpperCase(),
        name: newName.trim(),
        dimension: newDimension,
        base_unit: newBaseUnit,
        base_price: parseFloat(newBasePrice),
        stock: parseFloat(newStock)
      };
      setProducts([newProduct, ...products]);

      // Reset form fields
      setNewSku('');
      setNewName('');
      setNewDimension('weight');
      setNewBaseUnit('kg');
      setNewBasePrice('');
      setNewStock('');
      setIsAdding(false);
    }
  }

  // Enable inline editing mode for a product
  function startEditing(product: Product) {
    setEditingSku(product.sku);
    setEditPrice(product.base_price.toString());
    setEditStock(product.stock.toString());
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Save updated product price/stock
  async function handleSaveEdit(sku: string) {
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const priceNum = parseFloat(editPrice);
    const stockNum = parseFloat(editStock);

    const res = await updateProductAction(sku, priceNum, stockNum);

    if (res.error) {
      setErrorMessage(res.error);
      setIsUpdating(false);
    } else {
      setSuccessMessage(`Product SKU ${sku} updated successfully.`);
      // Update local state list
      setProducts(
        products.map((p) => {
          if (p.sku === sku) {
            return { ...p, base_price: priceNum, stock: stockNum };
          }
          return p;
        })
      );
      setEditingSku(null);
      setIsUpdating(false);
    }
  }

  // Handle deleting a product
  async function handleDeleteProduct(sku: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await deleteProductAction(sku);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSuccessMessage(`Product "${name}" deleted.`);
      setProducts(products.filter((p) => p.sku !== sku));
      if (editingSku === sku) setEditingSku(null);
    }
  }

  // Handle approving or rejecting an order
  async function handleResolveOrder(orderId: string, status: 'approved' | 'rejected') {
    setIsResolvingOrder(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateOrderStatusAction(orderId, status);

    if (res.error) {
      setErrorMessage(res.error);
      setIsResolvingOrder(false);
    } else {
      setSuccessMessage(`Order has been marked as ${status}!`);

      // 1. Update order status in UI local state
      setOrders(
        orders.map((o) => {
          if (o.id === orderId) {
            return { ...o, status };
          }
          return o;
        })
      );

      // 2. If approved, we need to subtract local inventory stock in the UI state
      if (status === 'approved') {
        const itemsForThisOrder = orderItems.filter((item) => item.order_id === orderId);
        
        // Loop through order items and reduce stock locally
        const updatedProducts = products.map((prod) => {
          const itemMatch = itemsForThisOrder.find((item) => item.product_name === prod.name);
          if (itemMatch) {
            return { ...prod, stock: prod.stock - itemMatch.converted_quantity };
          }
          return prod;
        });

        setProducts(updatedProducts);
      }

      setIsResolvingOrder(false);
    }
  }

  // Handle adding a seller
  async function handleAddSeller(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAddingSeller(true);

    const res = await addSellerAction(newSellerEmail, newSellerPassword);

    if (res.error) {
      setErrorMessage(res.error);
      setIsAddingSeller(false);
    } else {
      setSuccessMessage(`Seller "${newSellerEmail}" registered successfully!`);
      // Update local sellers state list
      setSellers([...sellers, { email: newSellerEmail, role: 'seller' }]);
      setNewSellerEmail('');
      setNewSellerPassword('');
      setIsAddingSeller(false);
    }
  }

  // Handle deleting a seller
  async function handleDeleteSeller(email: string) {
    if (!confirm(`Are you sure you want to delete seller account "${email}"?`)) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await deleteSellerAction(email);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSuccessMessage(`Seller "${email}" removed.`);
      // Update local sellers state list
      setSellers(sellers.filter((s) => s.email !== email));
    }
  }

  // Client-side logout handler
  async function handleLogout() {
    await logoutAction();
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col">
      {/* Header bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">SynthFlow</h1>
            <p className="text-xs text-neutral-400">Admin Control Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-neutral-300">👤 {userEmail}</p>
            <p className="text-xs text-emerald-500 font-semibold uppercase">Administrator</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </header>

      {/* Main content layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {/* Tab Switcher */}
        <div className="flex gap-4 border-b border-neutral-800 pb-px">
          <button
            onClick={() => {
              setActiveTab('products');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            📦 Inventory Products
          </button>
          <button
            onClick={() => {
              setActiveTab('orders');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            🧾 Quotations & Orders
          </button>
          <button
            onClick={() => {
              setActiveTab('sellers');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sellers'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            👥 Manage Sellers
          </button>
        </div>

        {/* Global Success / Error Toast Banners */}
        {errorMessage && (
          <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-sm">
            ⚠️ <strong>Error:</strong> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-400 text-sm">
            ✅ <strong>Notification:</strong> {successMessage}
          </div>
        )}

        {/* ================= TAB 1: INVENTORY PRODUCTS ================= */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Add Product Form (4 columns) */}
            <section className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 h-fit">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                <span>➕</span> Add New Product
              </h2>

              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">SKU (Unique Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHEM-006"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Chemical/Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sodium Bicarbonate"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Dimension</label>
                    <select
                      value={newDimension}
                      onChange={(e) => handleDimensionChange(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="weight">Weight (Mass)</option>
                      <option value="volume">Volume (Liquid)</option>
                      <option value="count">Count (Countable)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Base Unit</label>
                    <select
                      value={newBaseUnit}
                      onChange={(e) => setNewBaseUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {newDimension === 'weight' && (
                        <>
                          <option value="kg">kg (kilograms)</option>
                          <option value="g">g (grams)</option>
                        </>
                      )}
                      {newDimension === 'volume' && (
                        <>
                          <option value="L">L (liters)</option>
                          <option value="mL">mL (milliliters)</option>
                        </>
                      )}
                      {newDimension === 'count' && (
                        <option value="item">item (count)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Price per Base Unit (INR)</label>
                    <input
                      type="number"
                      required
                      min="0.00000001"
                      step="any"
                      placeholder="e.g. 350.00"
                      value={newBasePrice}
                      onChange={(e) => setNewBasePrice(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Initial Stock Level</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 50"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium rounded-lg text-sm transition-all shadow-md mt-2 cursor-pointer"
                >
                  {isAdding ? 'Adding...' : 'Save Product'}
                </button>
              </form>
            </section>

            {/* Right Box: Products Table (8 columns) */}
            <section className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5 overflow-hidden flex flex-col">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                <span>📦</span> Current Inventory Levels
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 text-xs">
                      <th className="py-3 px-2">SKU</th>
                      <th className="py-3 px-2">Product Name</th>
                      <th className="py-3 px-2">Dimension</th>
                      <th className="py-3 px-2 text-right">Price per Unit</th>
                      <th className="py-3 px-2 text-right">Current Stock</th>
                      <th className="py-3 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-500">
                          No products exist. Use the form to add one.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => {
                        const isEditing = editingSku === prod.sku;
                        return (
                          <tr key={prod.sku} className="border-b border-neutral-800/60 hover:bg-neutral-800/20 text-neutral-200">
                            <td className="py-3 px-2 font-mono font-semibold text-emerald-500">{prod.sku}</td>
                            <td className="py-3 px-2 font-medium text-white">{prod.name}</td>
                            <td className="py-3 px-2 text-xs text-neutral-400 capitalize">{prod.dimension}</td>
                            
                            {/* Price field (editing state or normal text) */}
                            <td className="py-3 px-2 text-right font-medium">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-20 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-right text-sm focus:outline-none"
                                />
                              ) : (
                                <>
                                  <span>{prod.base_price.toFixed(2)} INR</span>
                                  <span className="text-xs text-neutral-500">/{prod.base_unit}</span>
                                </>
                              )}
                            </td>

                            {/* Stock field (editing state or normal text) */}
                            <td className="py-3 px-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={editStock}
                                  onChange={(e) => setEditStock(e.target.value)}
                                  className="w-20 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-right text-sm focus:outline-none"
                                />
                              ) : (
                                <span className={prod.stock <= 10 ? 'text-red-400 font-semibold' : 'text-neutral-300'}>
                                  {prod.stock.toFixed(2)} {prod.base_unit}
                                </span>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="py-3 px-2 text-center space-x-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(prod.sku)}
                                    disabled={isUpdating}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs font-semibold text-white cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSku(null)}
                                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing(prod)}
                                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-emerald-400 rounded cursor-pointer"
                                    title="Edit Price & Stock"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(prod.sku, prod.name)}
                                    className="px-2 py-1 bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-xs text-neutral-500 rounded cursor-pointer"
                                    title="Delete Product"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 2: QUOTATIONS & ORDERS ================= */}
        {activeTab === 'orders' && (
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
              <span>🧾</span> Incoming Quotation Orders
            </h2>

            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-12">No orders have been submitted yet.</p>
              ) : (
                orders.map((order) => {
                  const itemsForOrder = orderItems.filter((item) => item.order_id === order.id);
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950/40"
                    >
                      {/* Order Header Summary Bar */}
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="p-4 bg-neutral-900/60 hover:bg-neutral-800/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <span className="text-neutral-400">Order ID:</span>
                            <span className="font-mono text-emerald-400">{order.id.slice(0, 8)}...</span>
                          </p>
                          <p className="text-xs text-neutral-400">
                            By Seller: <span className="font-medium text-white">{order.user_email}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-neutral-500">Order Subtotal:</p>
                            <p className="text-base font-bold text-emerald-400">{order.total_price.toFixed(2)} INR</p>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Status badge */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                order.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                  : order.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {order.status}
                            </span>
                            <span className="text-neutral-600 text-sm">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Order Items List */}
                      {isExpanded && (
                        <div className="p-4 border-t border-neutral-800 bg-neutral-900/10 space-y-4">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                              Line Items & Verification Math
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-neutral-800 text-neutral-500">
                                    <th className="py-2 px-1">Product Name</th>
                                    <th className="py-2 px-1 text-right">Seller Ordered Qty</th>
                                    <th className="py-2 px-1 text-center">➔</th>
                                    <th className="py-2 px-1 text-right text-emerald-400">Converted Qty (Base Unit)</th>
                                    <th className="py-2 px-1 text-right">Base Price Rate</th>
                                    <th className="py-2 px-1 text-right">Calculated Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsForOrder.map((item) => (
                                    <tr key={item.id} className="border-b border-neutral-800/40 text-neutral-300">
                                      <td className="py-2.5 px-1 font-medium text-white">{item.product_name}</td>
                                      <td className="py-2.5 px-1 text-right">
                                        {item.ordered_quantity} {item.ordered_unit}
                                      </td>
                                      <td className="py-2.5 px-1 text-center text-neutral-500 font-bold">➔</td>
                                      <td className="py-2.5 px-1 text-right font-semibold text-emerald-400">
                                        {item.converted_quantity.toFixed(8)} {item.base_unit}
                                      </td>
                                      <td className="py-2.5 px-1 text-right text-neutral-400">
                                        {item.price_per_base_unit.toFixed(2)} INR/{item.base_unit}
                                      </td>
                                      <td className="py-2.5 px-1 text-right font-medium text-white">
                                        {item.calculated_price.toFixed(2)} INR
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Decision actions (if order is pending) */}
                          {order.status === 'pending' ? (
                            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                              <button
                                onClick={() => handleResolveOrder(order.id, 'rejected')}
                                disabled={isResolvingOrder}
                                className="px-4 py-2 bg-red-950/40 border border-red-950 text-red-400 hover:bg-red-900/30 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                              >
                                Reject Order
                              </button>
                              <button
                                onClick={() => handleResolveOrder(order.id, 'approved')}
                                disabled={isResolvingOrder}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all shadow shadow-emerald-900/50 cursor-pointer"
                              >
                                Approve Order (Subtract Stock)
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end pt-2 text-xs text-neutral-500 font-medium">
                              Order processed. Status: <span className="capitalize font-semibold text-neutral-400 ml-1">{order.status}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ================= TAB 3: MANAGE SELLERS ================= */}
        {activeTab === 'sellers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Register Seller Form (4 columns) */}
            <section className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 h-fit">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                <span>👥</span> Register New Seller
              </h2>

              <form onSubmit={handleAddSeller} className="space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Seller Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. seller3@company.com"
                    value={newSellerEmail}
                    onChange={(e) => setNewSellerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Login Password</label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. password123"
                    value={newSellerPassword}
                    onChange={(e) => setNewSellerPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingSeller}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium rounded-lg text-sm transition-all shadow-md mt-2 cursor-pointer"
                >
                  {isAddingSeller ? 'Registering...' : 'Register Seller'}
                </button>
              </form>
            </section>

            {/* Right Box: Sellers Table (8 columns) */}
            <section className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5 overflow-hidden flex flex-col">
              <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2">
                <span>👥</span> Registered Sellers
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 text-xs">
                      <th className="py-3 px-2">Seller Email</th>
                      <th className="py-3 px-2">Role</th>
                      <th className="py-3 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-neutral-500">
                          No sellers registered. Use the form to add one.
                        </td>
                      </tr>
                    ) : (
                      sellers.map((s) => (
                        <tr key={s.email} className="border-b border-neutral-800/60 hover:bg-neutral-800/20 text-neutral-200">
                          <td className="py-3 px-2 font-medium text-white">{s.email}</td>
                          <td className="py-3 px-2 text-xs text-neutral-400 capitalize">{s.role}</td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleDeleteSeller(s.email)}
                              className="px-3 py-1 bg-red-950/20 text-red-400 border border-red-950/40 hover:bg-red-900/40 text-xs font-semibold rounded transition-all cursor-pointer"
                              title="Delete Seller Account"
                            >
                              🗑️ Remove Seller
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

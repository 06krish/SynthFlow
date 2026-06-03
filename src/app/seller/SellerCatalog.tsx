'use client';

import React, { useState, useEffect } from 'react';
import { logoutAction } from '@/lib/auth';
import { placeOrderAction } from './actions';
import { calculateItemPrice, convertQuantity } from '@/lib/conversion';

interface Product {
  sku: string;
  name: string;
  dimension: string;
  base_unit: string;
  base_price: number;
  stock: number;
}

interface CartItem {
  sku: string;
  name: string;
  orderedQty: number;
  orderedUnit: string;
  convertedQty: number;
  baseUnit: string;
  subtotal: number;
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

interface SellerCatalogProps {
  initialProducts: Product[];
  initialOrders: Order[];
  initialOrderItems: OrderItem[];
  userEmail: string;
  userRole: string;
}

export default function SellerCatalog({
  initialProducts,
  initialOrders,
  initialOrderItems,
  userEmail,
  userRole
}: SellerCatalogProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems);

  // Sync states with fresh server props
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setOrderItems(initialOrderItems);
  }, [initialOrderItems]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'cart' | 'history'>('cart');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Selection/Calculator form state
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products by search term (either by name or SKU)
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Return the units compatible with the product's dimension
  function getCompatibleUnits(dimension: string) {
    if (dimension === 'weight') return ['g', 'kg'];
    if (dimension === 'volume') return ['mL', 'L'];
    return ['item'];
  }

  // Handle selecting a product from the list
  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setQuantityInput('1');
    // Default to the product's base unit
    setSelectedUnit(product.base_unit);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Real-time calculation helper values
  let liveConvertedQty = 0;
  let liveSubtotal = 0;
  const numericQty = parseFloat(quantityInput) || 0;

  if (selectedProduct && selectedUnit && numericQty > 0) {
    try {
      liveConvertedQty = convertQuantity(numericQty, selectedUnit, selectedProduct.base_unit);
      liveSubtotal = calculateItemPrice(
        numericQty,
        selectedUnit,
        selectedProduct.base_unit,
        selectedProduct.base_price
      );
    } catch (e) {
      // Ignore dimension mismatch errors while typing
    }
  }

  // Add item to cart
  function handleAddToCart() {
    if (!selectedProduct) return;
    if (numericQty <= 0) {
      setErrorMessage('Please enter a valid quantity greater than 0.');
      return;
    }

    // Check if item already exists in cart
    const existingIndex = cart.findIndex((item) => item.sku === selectedProduct.sku);

    const newItem: CartItem = {
      sku: selectedProduct.sku,
      name: selectedProduct.name,
      orderedQty: numericQty,
      orderedUnit: selectedUnit,
      convertedQty: liveConvertedQty,
      baseUnit: selectedProduct.base_unit,
      subtotal: liveSubtotal
    };

    if (existingIndex > -1) {
      // Overwrite the existing cart item with the new configuration
      const updatedCart = [...cart];
      updatedCart[existingIndex] = newItem;
      setCart(updatedCart);
    } else {
      setCart([...cart, newItem]);
    }

    setSuccessMessage(`Added ${selectedProduct.name} to your order.`);
    // Reset selection panel
    setSelectedProduct(null);
  }

  // Remove item from cart
  function handleRemoveFromCart(sku: string) {
    setCart(cart.filter((item) => item.sku !== sku));
  }

  // Submit all items in cart to the database
  async function handleSubmitOrder() {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cartItemsInput = cart.map((item) => ({
      sku: item.sku,
      orderedQty: item.orderedQty,
      orderedUnit: item.orderedUnit
    }));

    const result = await placeOrderAction(cartItemsInput);

    if (result.error) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
    } else {
      setSuccessMessage(`Success! Your order (ID: ${result.orderId?.slice(0, 8)}...) has been submitted.`);
      
      const newOrderId = result.orderId!;
      const newOrder: Order = {
        id: newOrderId,
        user_email: userEmail,
        status: 'pending',
        total_price: cartTotal,
        created_at: new Date()
      };

      const newItems: OrderItem[] = cart.map((item, idx) => ({
        id: Date.now() + idx,
        order_id: newOrderId,
        product_name: item.name,
        ordered_quantity: item.orderedQty,
        ordered_unit: item.orderedUnit,
        converted_quantity: item.convertedQty,
        base_unit: item.baseUnit,
        price_per_base_unit: item.subtotal / item.convertedQty,
        calculated_price: item.subtotal
      }));

      setOrders([newOrder, ...orders]);
      setOrderItems([...newItems, ...orderItems]);
      
      setCart([]); // Clear cart
      setRightTab('history'); // Switch tab to show their order history
      setIsSubmitting(false);
    }
  }

  // Calculate cart total price
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

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
          <span className="text-2xl">🧪</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">SynthFlow</h1>
            <p className="text-xs text-neutral-400">Order & Stock Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-neutral-300">👤 {userEmail}</p>
            <p className="text-xs text-emerald-500 capitalize">{userRole} Mode</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </header>

      {/* Main dashboard body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Product Search & List (5 cols) */}
        <section className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col h-[650px]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>🔍</span> Product Catalog
            </h2>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-neutral-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredProducts.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8">No products found.</p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.sku}
                  onClick={() => handleSelectProduct(product)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all hover:bg-neutral-800 flex justify-between items-start cursor-pointer ${
                    selectedProduct?.sku === product.sku
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-emerald-400">{product.name}</p>
                    <p className="text-xs text-neutral-500">SKU: {product.sku}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Dimension: <span className="capitalize">{product.dimension}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{product.base_price.toFixed(2)} INR</p>
                    <p className="text-xs text-neutral-500">per {product.base_unit}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Stock: <span className={product.stock <= 10 ? 'text-red-400 font-semibold' : 'text-neutral-300'}>{product.stock.toFixed(2)} {product.base_unit}</span>
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Center Column: Unit Converter / Selection Pane (4 cols) */}
        <section className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between h-[650px]">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-b border-neutral-800 pb-2">
              <span>⚙️</span> Interactive Order Builder
            </h2>

            {selectedProduct ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full uppercase tracking-wider">
                    {selectedProduct.dimension}
                  </span>
                  <h3 className="text-xl font-bold mt-2 text-white">{selectedProduct.name}</h3>
                  <p className="text-xs text-neutral-400">SKU: {selectedProduct.sku}</p>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Database Price Rate:</span>
                    <span className="font-medium text-white">{selectedProduct.base_price.toFixed(2)} INR / {selectedProduct.base_unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Available Stock:</span>
                    <span className="font-medium text-white">{selectedProduct.stock.toFixed(2)} {selectedProduct.base_unit}</span>
                  </div>
                </div>

                {/* Input forms */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Enter Quantity Needed</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0.00000001"
                        step="any"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      
                      {/* Compatible units dropdown */}
                      <select
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        {getCompatibleUnits(selectedProduct.dimension).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live conversion panel */}
                {numericQty > 0 && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                      Live Mathematics Preview
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-400">Unit Conversion:</p>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <span>{numericQty} {selectedUnit}</span>
                        <span>➔</span>
                        <span className="text-emerald-400">{liveConvertedQty.toFixed(8)} {selectedProduct.base_unit}</span>
                      </p>
                    </div>
                    <div className="border-t border-emerald-500/20 pt-2">
                      <p className="text-xs text-neutral-400">Calculated Item Subtotal:</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {liveSubtotal.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}{' '}
                        INR
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-500">
                <span className="text-4xl mb-2">📦</span>
                <p className="text-sm">Select a product from the catalog to build your order.</p>
              </div>
            )}
          </div>

          {selectedProduct && (
            <button
              onClick={handleAddToCart}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-all shadow-md cursor-pointer"
            >
              ➕ Add to Order List
            </button>
          )}
        </section>

        {/* Right Column: Cart / Order History Tab Selector (4 cols) */}
        <section className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between h-[650px]">
          <div className="flex flex-col h-[520px]">
            {/* Tab header buttons */}
            <div className="flex gap-4 border-b border-neutral-800 pb-2 mb-4 text-xs font-semibold">
              <button
                onClick={() => {
                  setRightTab('cart');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`pb-1 px-1 border-b-2 transition-all cursor-pointer ${
                  rightTab === 'cart'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                🛒 Cart List ({cart.length})
              </button>
              <button
                onClick={() => {
                  setRightTab('history');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`pb-1 px-1 border-b-2 transition-all cursor-pointer ${
                  rightTab === 'history'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                🧾 My Orders ({orders.length})
              </button>
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs">
                ⚠️ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-400 text-xs">
                ✅ {successMessage}
              </div>
            )}

            {/* Tab 1: Cart View */}
            {rightTab === 'cart' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
                    <span className="text-3xl mb-2">🛒</span>
                    <p className="text-xs">Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.sku}
                      className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs flex justify-between items-center"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-emerald-400">{item.name}</p>
                        <p className="text-neutral-400">
                          Qty: {item.orderedQty} {item.orderedUnit}
                        </p>
                        <p className="text-neutral-500">
                          Converted: {item.convertedQty.toFixed(4)} {item.baseUnit}
                        </p>
                        <p className="text-white font-medium">{item.subtotal.toFixed(2)} INR</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.sku)}
                        className="p-1 bg-red-950/30 text-red-400 border border-red-950 rounded hover:bg-red-900/50 cursor-pointer"
                        title="Remove Item"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Past Orders History (Only own orders) */}
            {rightTab === 'history' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
                    <span className="text-3xl mb-2">🧾</span>
                    <p className="text-xs">You have not placed any orders yet.</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const items = orderItems.filter((oi) => oi.order_id === order.id);
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div
                        key={order.id}
                        className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950/40 text-xs"
                      >
                        {/* Header bar click to toggle expansion */}
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-3 bg-neutral-900/60 hover:bg-neutral-800/40 cursor-pointer flex justify-between items-center gap-2"
                        >
                          <div>
                            <p className="font-mono text-emerald-400">ID: {order.id.slice(0, 8)}...</p>
                            <p className="text-[10px] text-neutral-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">{order.total_price.toFixed(2)} INR</p>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                                order.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                  : order.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Order items lists under this order */}
                        {isExpanded && (
                          <div className="p-2 border-t border-neutral-800 bg-neutral-900/10 space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="pb-1.5 border-b border-neutral-800/40 last:border-b-0"
                              >
                                <p className="font-semibold text-white">{item.product_name}</p>
                                <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                                  <span>
                                    Ordered: {item.ordered_quantity} {item.ordered_unit}
                                  </span>
                                  <span>
                                    ➔ {item.converted_quantity.toFixed(4)} {item.base_unit}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[10px] text-neutral-400">
                                  <span>
                                    Rate: {item.price_per_base_unit.toFixed(2)} INR/{item.base_unit}
                                  </span>
                                  <span className="text-emerald-400 font-medium">
                                    {item.calculated_price.toFixed(2)} INR
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Cart checkout footer (Only shows when on Cart Tab) */}
          {rightTab === 'cart' ? (
            <div className="border-t border-neutral-800 pt-4 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-neutral-400">Grand Total:</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {cartTotal.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}{' '}
                  INR
                </span>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-neutral-400 text-white font-semibold rounded-lg text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <span>Submitting...</span> : <span>Submit Quotation</span>}
              </button>
            </div>
          ) : (
            <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 text-center font-medium">
              Click on any order to view details and check conversions.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

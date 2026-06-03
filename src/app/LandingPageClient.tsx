'use client';

import React, { useState } from 'react';
import { logoutAction } from '@/lib/auth';
import { convertQuantity, UNIT_FACTORS } from '@/lib/conversion';

interface UserSession {
  email: string | null;
  role: string | null;
}

interface LandingPageClientProps {
  initialUser: UserSession;
}

export default function LandingPageClient({ initialUser }: LandingPageClientProps) {
  // Session states
  const [user, setUser] = useState<UserSession>(initialUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Interactive Live Calculator state
  const [calcAmount, setCalcAmount] = useState<string>('500');
  const [calcFrom, setCalcFrom] = useState<string>('g');
  const [calcTo, setCalcTo] = useState<string>('kg');
  const [calcResult, setCalcResult] = useState<number | null>(0.5);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Trigger calculations on state changes
  function handleCalculate(amountStr: string, from: string, to: string) {
    setCalcAmount(amountStr);
    setCalcFrom(from);
    setCalcTo(to);
    setCalcError(null);

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      setCalcResult(null);
      return;
    }

    try {
      const res = convertQuantity(amount, from, to);
      setCalcResult(res);
    } catch (err: any) {
      setCalcResult(null);
      setCalcError(err.message || 'Dimension mismatch');
    }
  }

  // Handle logout
  async function handleLogout() {
    setIsLoggingOut(true);
    await logoutAction();
    setUser({ email: null, role: null });
    setIsLoggingOut(false);
  }

  const units = Object.keys(UNIT_FACTORS);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Sticky Glass Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-pulse">🧪</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">SynthFlow</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">B2B Chem-Portal</p>
          </div>
        </div>

        {/* Desktop Navbar Menu links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <a href="#features" className="hover:text-white transition-all">Features</a>
          <a href="#calculator" className="hover:text-white transition-all">Live Calculator</a>
          <a href="#portals" className="hover:text-white transition-all">Portals overview</a>
        </nav>

        {/* Dynamic Auth Buttons */}
        <div className="flex items-center gap-3">
          {user.email ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 hidden sm:inline-block bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800">
                👤 {user.email} ({user.role})
              </span>
              <a
                href={user.role === 'admin' ? '/admin' : '/seller'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold rounded-lg transition-all shadow-md cursor-pointer"
              >
                Dashboard →
              </a>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg transition-all border border-neutral-700 cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <a
                href="/login?role=seller"
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-sm font-semibold rounded-lg border border-neutral-800 text-neutral-200 transition-all cursor-pointer"
              >
                👤 Seller Login
              </a>
              <a
                href="/login?role=admin"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white rounded-lg transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                ⚙️ Admin Login
              </a>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto w-full text-center flex flex-col items-center">
        <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-wider mb-6 animate-fade-in">
          💡 High Precision Chemical Order Dispatch
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Sleek Inventory Control & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
            Precise Math Conversions
          </span>
        </h1>
        <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mt-6 leading-relaxed">
          Manage compounds across weight, volume, or count dimensions. Automatically verify unit conversions, isolate multi-seller transactions, and resolve stock levels on approval.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
          {user.email ? (
            <a
              href={user.role === 'admin' ? '/admin' : '/seller'}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-base font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
            >
              Go to your Dashboard →
            </a>
          ) : (
            <>
              <a
                href="/login?role=seller"
                className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-base font-semibold rounded-xl border border-neutral-800 text-neutral-200 transition-all cursor-pointer"
              >
                Access Seller Catalog
              </a>
              <a
                href="/login?role=admin"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-base font-semibold text-white rounded-xl transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                Open Admin Portal
              </a>
            </>
          )}
        </div>
      </section>

      {/* Feature Section Grid */}
      <section id="features" className="py-16 px-6 max-w-7xl w-full mx-auto border-t border-neutral-900">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Designed for Safety and Clarity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <span className="text-3xl">🧮</span>
            <h3 className="text-lg font-bold text-white mt-4">Strict Numeric Precision</h3>
            <p className="text-sm text-neutral-400 mt-2">
              All quantities are converted and saved in the database with high-precision decimal mapping (`NUMERIC(20, 8)`) to eliminate rounding discrepancies.
            </p>
          </div>

          <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <span className="text-3xl">👥</span>
            <h3 className="text-lg font-bold text-white mt-4">Isolated Multi-Seller Portal</h3>
            <p className="text-sm text-neutral-400 mt-2">
              Sellers can browse products, build carts using live conversion tools, and track their own quotation lists with total isolation.
            </p>
          </div>

          <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <span className="text-3xl">✅</span>
            <h3 className="text-lg font-bold text-white mt-4">Real-time Stock Dispatch</h3>
            <p className="text-sm text-neutral-400 mt-2">
              Admins review the seller's order conversion math, verify stock availability, and update status. Stock is subtracted instantly upon approval.
            </p>
          </div>

        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section id="calculator" className="py-16 px-6 max-w-3xl w-full mx-auto border-t border-neutral-900 flex flex-col items-center">
        <div className="text-center mb-8">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            Calculator Widget
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-4">Test Our Conversion Engine</h2>
          <p className="text-sm text-neutral-400 mt-2">
            Try converting units across weight (`g ↔ kg`), volume (`mL ↔ L`), or count (`item`) live.
          </p>
        </div>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Enter Quantity</label>
              <input
                type="number"
                step="any"
                value={calcAmount}
                onChange={(e) => handleCalculate(e.target.value, calcFrom, calcTo)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">From Unit</label>
              <select
                value={calcFrom}
                onChange={(e) => handleCalculate(calcAmount, e.target.value, calcTo)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">To Unit</label>
              <select
                value={calcTo}
                onChange={(e) => handleCalculate(calcAmount, calcFrom, e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculator Output Display */}
          <div className="mt-6 pt-6 border-t border-neutral-800 text-center">
            {calcError ? (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                ⚠️ <strong>Conversion Error:</strong> {calcError}
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold block mb-1">Result</span>
                <p className="text-xl sm:text-2xl font-bold">
                  {calcAmount} {calcFrom} = <span className="text-emerald-400">{calcResult !== null ? calcResult.toFixed(8).replace(/\.?0+$/, '') : '0'}</span> {calcTo}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Portal Roles Overview */}
      <section id="portals" className="py-16 px-6 max-w-5xl w-full mx-auto border-t border-neutral-900">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Access Roles Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Seller access card */}
          <div className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">👤</span>
                <h3 className="text-lg font-bold text-white">Seller Accounts</h3>
              </div>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">🟢 Search items and live convert pricing</li>
                <li className="flex items-center gap-2">🟢 Build order cards and dispatch requests</li>
                <li className="flex items-center gap-2">🟢 Track specific quotation history</li>
              </ul>
              <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono">
                <p className="text-neutral-500">Test Account:</p>
                <p className="text-emerald-400">seller@company.com</p>
                <p className="text-neutral-400">password: seller123</p>
              </div>
            </div>
            <a
              href="/login?role=seller"
              className="mt-6 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-center text-sm font-semibold rounded-lg text-neutral-200 border border-neutral-700 cursor-pointer"
            >
              Sign in as Seller
            </a>
          </div>

          {/* Admin access card */}
          <div className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚙️</span>
                <h3 className="text-lg font-bold text-white">Administrator Access</h3>
              </div>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">🟢 Manage catalog rates & stock quantities</li>
                <li className="flex items-center gap-2">🟢 Approve orders to subtract inventory</li>
                <li className="flex items-center gap-2">🟢 Create and delete seller login credentials</li>
              </ul>
              <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono">
                <p className="text-neutral-500">Test Account:</p>
                <p className="text-emerald-400">admin@company.com</p>
                <p className="text-neutral-400">password: admin123</p>
              </div>
            </div>
            <a
              href="/login?role=admin"
              className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-center text-sm font-semibold rounded-lg text-white shadow-md cursor-pointer"
            >
              Sign in as Admin
            </a>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-900 py-8 px-6 bg-neutral-950 text-center text-xs text-neutral-500">
        <p className="mb-2">🧪 <strong>SynthFlow Portal</strong> - Built with Next.js App Router, Tailwind CSS v4, and Neon Serverless Postgres.</p>
        <p>&copy; {new Date().getFullYear()} SynthFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}

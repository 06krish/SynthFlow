'use client';

import React, { useState, useEffect } from 'react';
import { loginAction } from '@/lib/auth';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check URL search params for quick testing accounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'seller') {
        setEmail('seller@company.com');
        setPassword('seller123');
      } else if (role === 'admin') {
        setEmail('krishraj.suj38@gmail.com');
        setPassword('3406@Krish');
      }
    }
  }, []);

  // This handles submitting the form in a simple React-way
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await loginAction(email, password);

    // If an error is returned, show it!
    if (result && result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result && result.redirectUrl) {
      // Direct client-side redirection!
      window.location.href = result.redirectUrl;
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Sleek emerald glow styling */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] opacity-10"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] opacity-10"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <span className="text-4xl">🔑</span>
            <h1 className="text-2xl font-bold tracking-tight mt-2 text-emerald-400">Inventory Portal</h1>
            <p className="text-neutral-400 text-sm mt-1">Sign in to manage stock and orders</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Email Address</label>
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@company.com or admin@company.com"
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-neutral-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-neutral-500 transition-all"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-400 text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Rookie-friendly test credentials guide */}
          <div className="mt-8 pt-6 border-t border-neutral-800 text-center text-xs text-neutral-500 space-y-1">
            <p className="font-semibold text-neutral-400">Demo Accounts:</p>
            <p>Admin: <code className="text-emerald-500/80">krishraj.suj38@gmail.com</code> / <code className="text-emerald-500/80">3406@Krish</code></p>
            <p>Seller: <code className="text-emerald-500/80">seller@company.com</code> / <code className="text-emerald-500/80">seller123</code></p>
          </div>
        </div>
      </div>
    </main>
  );
}

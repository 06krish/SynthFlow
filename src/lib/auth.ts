'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';

/**
 * Server Action to log in a user.
 * It checks credentials against the Neon database using a raw SQL query.
 */
export async function loginAction(email: string, password: string) {
  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address (e.g., user@domain.com).' };
  }

  try {
    // 1. Fetch user from Neon database using raw SQL
    const users = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1;
    `;
    const user = users[0];

    // 2. Validate user credentials
    if (!user || user.password !== password) {
      return { error: 'Invalid email or password.' };
    }

    // 3. Store session in plain cookies (Rookie-friendly, easily inspectable!)
    const cookieStore = await cookies();
    cookieStore.set('user_email', user.email, { path: '/' });
    cookieStore.set('user_role', user.role, { path: '/' });

    // 4. Return the redirection URL to the client instead of calling redirect() on the server
    return { 
      success: true, 
      redirectUrl: user.role === 'admin' ? '/admin' : '/seller' 
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: 'Connection error. Please check your database settings.' };
  }
}

/**
 * Server Action to log out a user by deleting session cookies.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('user_email');
  cookieStore.delete('user_role');
  return { success: true };
}

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn('Supabase backend auth is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'http://localhost',
  supabaseSecretKey || 'missing-supabase-secret-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetch,
      headers: { 'x-my-custom-header': 'my-app-name' },
    },
    realtime: {
      transport: WebSocket as any,
    },
  }
);

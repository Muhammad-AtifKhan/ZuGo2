require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error(
    'Missing SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in backend/.env'
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
});

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env');
    process.exit(1);
  }

  console.log('Checking if user exists...');
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('List error:', listErr.message);
    process.exit(1);
  }

  const existing = list.users.find((u) => u.email === email);

  if (existing) {
    console.log('User already exists — updating password & metadata...');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { role: 'super_admin', name: 'Admin' },
    });
    if (error) {
      console.error('Update error:', error.message);
      process.exit(1);
    }
    console.log('✅ Admin updated:', existing.id);
  } else {
    console.log('Creating new admin user...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'super_admin', name: 'Admin' },
    });
    if (error) {
      console.error('Create error:', error.message);
      process.exit(1);
    }
    console.log('✅ Admin created:', data.user.id);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

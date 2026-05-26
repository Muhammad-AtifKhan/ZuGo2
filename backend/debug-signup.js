require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
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

const prisma = new PrismaClient();
const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
});

async function testPassengerSignup() {
  console.log('\n=== Testing Passenger Signup Flow ===\n');

  try {
    const row = await prisma.passenger.findFirst();
    console.log('✅ DB connected. First passenger:', row ? row.email : 'none found');
  } catch (e) {
    console.error('❌ DB Error:', e.message);
    await prisma.$disconnect();
    return;
  }

  const testEmail = process.env.DEBUG_TEST_EMAIL || 'test_passenger_debug@zugo2.com';
  const testPassword = process.env.DEBUG_TEST_PASSWORD;

  if (!testPassword) {
    console.error('Set DEBUG_TEST_PASSWORD in backend/.env');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Creating test user: ${testEmail}`);
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { role: 'passenger', name: 'Debug Test' },
  });

  if (authError) {
    console.error('❌ Supabase createUser error:', authError.message);
  } else {
    console.log('✅ Supabase user created:', authData.user.id);
  }

  await prisma.$disconnect();
}

testPassengerSignup().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

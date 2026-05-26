import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your Supabase URL and ANON KEY from the Supabase Dashboard
const supabaseUrl = 'https://iezeutksvzhoxvkfgnwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_39VlDKRetsHk1CPhQ4DwAg_eyooE5mG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

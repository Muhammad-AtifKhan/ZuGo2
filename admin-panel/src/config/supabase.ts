import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iezeutksvzhoxvkfgnwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_39VlDKRetsHk1CPhQ4DwAg_eyooE5mG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

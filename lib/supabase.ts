'use client';

import { createClient } from '@supabase/supabase-js';

// Esta función solo debe ser llamada en el lado del cliente
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Las variables de entorno de Supabase no están configuradas');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};
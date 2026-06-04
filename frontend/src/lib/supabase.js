import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env',
  )
}

if (supabaseAnonKey.startsWith('sb_secret_')) {
  throw new Error(
    'Chave service_role/secret detectada no frontend. Use somente a anon/publishable key do Supabase em VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

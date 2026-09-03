import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local.',
  )
}

/**
 * La sesión se guarda en localStorage con una clave propia y estable.
 *
 * La clave fija importa: la que Supabase genera por defecto lleva dentro el id
 * del proyecto, así que si algún día se migra el backend todo el mundo
 * aparecería deslogueado de golpe.
 *
 * `flowType: 'pkce'` es el flujo recomendado para apps que corren en el
 * navegador: el código de autorización solo se puede canjear desde el mismo
 * dispositivo que lo pidió.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'reboteapp-auth',
  },
})

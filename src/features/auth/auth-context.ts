import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { UserRow } from '@/types/database'

export interface AuthContextValue {
  session: Session | null
  /** Perfil de public.users. null si la sesión existe pero falta el onboarding. */
  perfil: UserRow | null
  cargando: boolean
  refrescarPerfil: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

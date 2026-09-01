import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/types/database'
import { AuthContext } from './auth-context'

async function traerPerfil(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('No se pudo cargar el perfil', error)
    return null
  }
  return data
}

/**
 * Mantiene sesión y perfil sincronizados.
 *
 * Son dos cosas distintas a propósito: tener sesión (auth.users) no significa
 * tener perfil (public.users). Quien entra con Google por primera vez tiene
 * sesión pero le falta el onboarding, y el router lo manda a completarlo.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<UserRow | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vigente) return
      setSession(data.session)
      if (data.session) {
        setPerfil(await traerPerfil(data.session.user.id))
      }
      if (vigente) setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      if (!vigente) return
      setSession(nuevaSesion)
      setPerfil(nuevaSesion ? await traerPerfil(nuevaSesion.user.id) : null)
      setCargando(false)
    })

    return () => {
      vigente = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const refrescarPerfil = useCallback(async () => {
    if (!session) return
    setPerfil(await traerPerfil(session.user.id))
  }, [session])

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }, [])

  const valor = useMemo(
    () => ({ session, perfil, cargando, refrescarPerfil, cerrarSesion }),
    [session, perfil, cargando, refrescarPerfil, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

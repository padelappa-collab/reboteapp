import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/types/database'
import { AuthContext } from './auth-context'

/**
 * Devuelve el perfil, `null` si el jugador todavía no lo creó, o `undefined` si
 * la consulta falló.
 *
 * La diferencia entre null y undefined no es cosmética: `null` manda al
 * onboarding, así que un fallo de red no puede confundirse con "no tiene
 * perfil" o el jugador terminaría llenando el formulario otra vez.
 */
async function traerPerfil(userId: string): Promise<UserRow | null | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('No se pudo cargar el perfil', error)
    return undefined
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
        const encontrado = await traerPerfil(data.session.user.id)
        if (vigente && encontrado !== undefined) setPerfil(encontrado)
      }
      if (vigente) setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      if (!vigente) return
      setSession(nuevaSesion)

      if (!nuevaSesion) {
        setPerfil(null)
        setCargando(false)
        return
      }

      // si la consulta falla, conservamos el perfil que ya teníamos en vez de
      // mandar al jugador al onboarding por un corte de red
      const encontrado = await traerPerfil(nuevaSesion.user.id)
      if (vigente && encontrado !== undefined) setPerfil(encontrado)
      if (vigente) setCargando(false)
    })

    return () => {
      vigente = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const refrescarPerfil = useCallback(async () => {
    if (!session) return
    const encontrado = await traerPerfil(session.user.id)
    if (encontrado !== undefined) setPerfil(encontrado)
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

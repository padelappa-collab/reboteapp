import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CourtRow } from '@/types/database'

export function useCourts(ciudad?: string) {
  const [canchas, setCanchas] = useState<CourtRow[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true

    async function cargar() {
      let consulta = supabase.from('courts').select('*').order('nombre')
      if (ciudad) consulta = consulta.eq('ciudad', ciudad)

      const { data, error } = await consulta
      if (!vigente) return
      if (error) console.error('No se pudieron cargar las canchas', error)
      setCanchas(data ?? [])
      setCargando(false)
    }

    cargar()
    return () => {
      vigente = false
    }
  }, [ciudad])

  return { canchas, cargando }
}

import { useCallback, useEffect, useState } from 'react'
import { publicacionesAbiertas, type PublicacionConDatos } from './board.api'

export function useBoard(ciudad?: string) {
  const [publicaciones, setPublicaciones] = useState<PublicacionConDatos[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setPublicaciones(await publicacionesAbiertas(ciudad))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el tablón')
    } finally {
      setCargando(false)
    }
  }, [ciudad])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { publicaciones, cargando, error, recargar }
}

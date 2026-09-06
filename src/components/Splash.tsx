import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

/** Lo máximo que se queda en pantalla, pase lo que pase. */
const TOPE = 7000
/** Lo que tarda en desvanecerse una vez que ya no hace falta. */
const SALIDA = 350

/**
 * La pantalla de arranque.
 *
 * Tapa el hueco entre que la app se abre y sabe quién eres. Sin ella se ve un
 * fogonazo del marco vacío —cabecera, barra de abajo, contenido en blanco—
 * antes de que la sesión conteste, y eso se lee como que algo falló.
 *
 * Se va en cuanto está todo listo, con un tope de siete segundos: si la red se
 * atasca, más vale enseñar la app a medio cargar que dejar a alguien mirando un
 * logo sin saber si se colgó.
 *
 * Fondo negro y no el gris de la app: es el mismo negro del icono, así que el
 * salto desde la pantalla de inicio del teléfono no se nota.
 */
export function Splash() {
  const { cargando } = useAuth()
  const [montado, setMontado] = useState(true)
  const [saliendo, setSaliendo] = useState(false)
  const [vencido, setVencido] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVencido(true), TOPE)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (cargando && !vencido) return

    setSaliendo(true)
    // se desmonta al terminar la transición para no dejar una capa invisible
    // por encima de todo interceptando toques
    const t = setTimeout(() => setMontado(false), SALIDA)
    return () => clearTimeout(t)
  }, [cargando, vencido])

  if (!montado) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black',
        'transition-opacity duration-300',
        saliendo ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      // decorativa: quien use lector de pantalla no gana nada oyéndola
      aria-hidden="true"
    >
      <img src="/logo-96.png" alt="" width={88} height={88} className="rounded-2xl" />
      <p
        className="text-2xl font-semibold tracking-tight"
        style={{ color: 'var(--primary)' }}
      >
        REBOTEAPP
      </p>
    </div>
  )
}

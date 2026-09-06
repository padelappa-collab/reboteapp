import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

/**
 * Lo mínimo que se queda en pantalla.
 *
 * La sesión suele contestar en decenas de milisegundos, así que sin este suelo
 * la pantalla aparecía y desaparecía de golpe: un parpadeo negro que se lee como
 * un fallo, no como una entrada. Con tres segundos se ve el logo, se entiende
 * que la app está arrancando, y la salida parece decidida.
 */
const MINIMO = 3000
/** Lo máximo que se queda, pase lo que pase. */
const TOPE = 7000
/** Lo que tarda en desvanecerse. Corto: una salida lenta también parece un fallo. */
const SALIDA = 220

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
  const [cumplioMinimo, setCumplioMinimo] = useState(false)

  /*
   * El negro se pinta también en el documento, no solo en la capa.
   *
   * La capa cubre la ventana, pero por debajo quedaba asomando una franja del
   * gris de la app: el hueco de la barra de gestos en el teléfono y lo que se ve
   * al rebotar el scroll. Pintando de negro la raíz mientras dura, la pantalla
   * es negra entera y sin costuras.
   */
  useEffect(() => {
    if (!montado) return
    const raiz = document.documentElement
    raiz.classList.add('arrancando')
    return () => raiz.classList.remove('arrancando')
  }, [montado])

  useEffect(() => {
    const corto = setTimeout(() => setCumplioMinimo(true), MINIMO)
    const largo = setTimeout(() => setVencido(true), TOPE)
    return () => {
      clearTimeout(corto)
      clearTimeout(largo)
    }
  }, [])

  useEffect(() => {
    // se va cuando ya cargó Y se cumplió el mínimo, o cuando se acabó el tiempo
    if ((cargando || !cumplioMinimo) && !vencido) return

    setSaliendo(true)
    // se desmonta al terminar la transición para no dejar una capa invisible
    // por encima de todo interceptando toques
    const t = setTimeout(() => setMontado(false), SALIDA)
    return () => clearTimeout(t)
  }, [cargando, cumplioMinimo, vencido])

  if (!montado) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black',
        // por si el teclado o la barra del navegador cambian la altura visible
        'min-h-dvh',
        'transition-opacity duration-200',
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

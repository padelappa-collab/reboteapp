import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Que este navegador ya hizo el recorrido. */
const CLAVE = 'reboteapp-tour-visto'

export function tourPendiente(): boolean {
  return localStorage.getItem(CLAVE) !== '1'
}

type Paso = {
  /** A qué sección hay que ir antes de señalar. */
  ruta: string
  /** El `data-tour` de lo que se ilumina. Sin él, la tarjeta sale centrada. */
  ancla?: string
  titulo: string
  texto: string
}

/**
 * El recorrido, sección por sección.
 *
 * Cada paso lleva a su pantalla y señala el botón del que habla, porque
 * explicar "en Partidos puedes registrar" sirve de poco si después hay que
 * buscar dónde. Lo que se ilumina es siempre algo que existe en esa pantalla.
 *
 * Los textos dicen qué hace el botón y, cuando hace falta, la regla que se
 * descubre tarde: que un partido no cuenta hasta que lo confirman los cuatro,
 * que los rankings son tres y separados, y que las canchas no se reservan aquí.
 */
const PASOS: Paso[] = [
  {
    ruta: '/social',
    titulo: 'Te enseño la app',
    texto:
      'Son dos minutos. Te llevo por cada sección y te muestro para qué sirve cada botón. Puedes salirte cuando quieras.',
  },
  {
    ruta: '/social',
    ancla: 'nav',
    titulo: 'Las cinco secciones',
    texto:
      'Esta barra es todo el menú: Social, Partidos, Tablón, Ranking y Canchas. La que estás viendo se pone en verde.',
  },
  {
    ruta: '/social',
    ancla: 'historias',
    titulo: 'Historias',
    texto:
      'Los círculos de arriba son historias: fotos o vídeos que duran 24 horas. El primero es el tuyo, tócalo para subir una.',
  },
  {
    ruta: '/social',
    ancla: 'publicar',
    titulo: 'Publicar',
    texto:
      'Con este botón subes una foto al feed. Puedes engancharle un partido ya registrado para que se vea el resultado.',
  },
  {
    ruta: '/social',
    ancla: 'mensajes',
    titulo: 'Mensajes',
    texto:
      'Aquí están tus conversaciones. Puedes escribirle a quien sigas y a quien tenga la cuenta abierta.',
  },
  {
    ruta: '/partidos',
    ancla: 'registrar-partido',
    titulo: 'Registrar un partido',
    texto:
      'Pones el resultado y eliges a los cuatro que jugaron. Ojo: no cuenta para el ranking hasta que los cuatro lo confirman, así que recuérdaselo si tardan.',
  },
  {
    ruta: '/tablon',
    ancla: 'tablon-pestanas',
    titulo: 'Tablón',
    texto:
      '¿Te falta un cuarto? Publica el día, la cancha y el nivel, y quien quiera se apunta. En "Abiertas" ves lo que publicaron los demás.',
  },
  {
    ruta: '/tablon',
    ancla: 'torneos',
    titulo: 'Torneos',
    texto:
      'Desde aquí entras a los torneos: te inscribes en pareja y el organizador arma los cruces y va cargando resultados.',
  },
  {
    ruta: '/ranking',
    ancla: 'rankings',
    titulo: 'Tres rankings, no uno',
    texto:
      'Masculino, femenino y mixto van por separado. Cada partido mueve solo el que le toca según quién jugó, así que puedes estar alto en uno y empezando en otro.',
  },
  {
    ruta: '/canchas',
    titulo: 'Canchas',
    texto:
      'El mapa te dice dónde están las canchas de Cartagena y cómo contactarlas. Es informativo: la reserva se hace directo con cada club, no desde la app.',
  },
  {
    ruta: '/social',
    ancla: 'avisos',
    titulo: 'Novedades',
    texto:
      'La campana avisa cuando te agregan a un partido, te piden confirmar, te siguen o te escriben. El punto rojo dice cuántas te faltan por ver.',
  },
  {
    ruta: '/social',
    ancla: 'perfil',
    titulo: 'Tu perfil',
    texto:
      'Tu foto, tus publicaciones, tus insignias y tus puntos. Desde ahí también instalas la app y puedes volver a ver este recorrido.',
  },
]

/** Dónde está el elemento y cuánto mide, en coordenadas de pantalla. */
type Hueco = { top: number; left: number; width: number; height: number }

const MARGEN = 8

export function GuidedTour({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const [i, setI] = useState(0)
  const [hueco, setHueco] = useState<Hueco | null>(null)

  const paso = PASOS[i]
  const ultimo = i === PASOS.length - 1

  /** En qué paso se pidió ya la navegación, para no repetirla. */
  const navegadoEn = useRef(-1)

  const cerrar = useCallback(() => {
    localStorage.setItem(CLAVE, '1')
    setI(0)
    setHueco(null)
    navegadoEn.current = -1
    onCerrar()
  }, [onCerrar])

  /**
   * Llevar a la sección del paso, una sola vez por paso.
   *
   * Mirar `pathname` en las dependencias parecía lo natural, pero encadena un
   * bucle infinito en cuanto la ruta destino no se puede abrir: el recorrido
   * navega, algo devuelve a la anterior, y el efecto vuelve a intentarlo sin
   * parar. Basta con pedirlo al entrar en el paso; si el destino rebota, el
   * recorrido sigue igual y el foco simplemente no encuentra su ancla.
   */
  useEffect(() => {
    if (!abierto) return
    if (navegadoEn.current === i) return
    navegadoEn.current = i
    if (pathname !== paso.ruta) navegar(paso.ruta)
    // pathname queda fuera a propósito: ver el comentario de arriba
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, i, paso.ruta, navegar])

  /**
   * Buscar el elemento y medirlo.
   *
   * No basta con mirar una vez: al cambiar de sección la pantalla todavía está
   * cargando y el botón puede tardar en aparecer. Se reintenta un momento y, si
   * no aparece, la tarjeta sale centrada sin señalar nada. Un paso sin foco es
   * mejor que un recorrido que se atasca.
   */
  useLayoutEffect(() => {
    if (!abierto) return
    if (!paso.ancla) {
      setHueco(null)
      return
    }

    let vivo = true
    let intentos = 0

    function medir() {
      if (!vivo) return
      const el = document.querySelector<HTMLElement>(`[data-tour="${paso.ancla}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          el.scrollIntoView({ block: 'center', behavior: 'auto' })
          const r2 = el.getBoundingClientRect()
          setHueco({
            top: r2.top - MARGEN,
            left: r2.left - MARGEN,
            width: r2.width + MARGEN * 2,
            height: r2.height + MARGEN * 2,
          })
          return
        }
      }
      if (intentos++ < 30) requestAnimationFrame(medir)
      else setHueco(null)
    }

    medir()
    return () => {
      vivo = false
    }
  }, [abierto, paso.ancla, pathname])

  // reencuadrar si la pantalla cambia de tamaño o gira
  useEffect(() => {
    if (!abierto) return
    function alCambiar() {
      setHueco(null)
    }
    window.addEventListener('resize', alCambiar)
    window.addEventListener('orientationchange', alCambiar)
    return () => {
      window.removeEventListener('resize', alCambiar)
      window.removeEventListener('orientationchange', alCambiar)
    }
  }, [abierto])

  if (!abierto) return null

  // la tarjeta va debajo del hueco si cabe, y si no, encima
  const alto = window.innerHeight
  const debajo = hueco ? hueco.top + hueco.height + 12 : 0
  const cabeAbajo = hueco ? alto - debajo > 230 : false

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/*
        El foco es un recuadro transparente con una sombra enorme alrededor:
        oscurece toda la pantalla menos lo que se está explicando, sin recortar
        nada ni duplicar el elemento.
      */}
      {hueco ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: hueco.top,
            left: hueco.left,
            width: hueco.width,
            height: hueco.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/72" />
      )}

      <div
        className={cn(
          'absolute inset-x-0 mx-auto max-w-md px-4',
          !hueco && 'top-1/2 -translate-y-1/2',
        )}
        style={
          hueco
            ? cabeAbajo
              ? { top: debajo }
              : { bottom: alto - hueco.top + 12 }
            : undefined
        }
      >
        <div className="space-y-3 rounded-[var(--radius)] bg-card p-4 shadow-xl">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">{paso.titulo}</h2>
            <span className="numero shrink-0 text-xs text-muted-foreground">
              {i + 1}/{PASOS.length}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{paso.texto}</p>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" className="h-10 flex-1" onClick={cerrar}>
              {ultimo ? 'Cerrar' : 'Saltar'}
            </Button>
            {i > 0 && !ultimo && (
              <Button
                variant="outline"
                className="h-10"
                onClick={() => setI((n) => n - 1)}
              >
                Atrás
              </Button>
            )}
            <Button
              className="h-10 flex-1"
              onClick={() => (ultimo ? cerrar() : setI((n) => n + 1))}
            >
              {ultimo ? 'Empezar' : 'Siguiente'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

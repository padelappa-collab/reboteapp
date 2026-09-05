import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { historiasDe, verHistoria, type AutorConHistorias, type Historia } from './stories.api'

/** Lo que dura una historia en pantalla si nadie la toca. */
const DURACION = 5000
/** Cuánto hay que arrastrar hacia abajo para que se cierre. */
const CIERRE = 90

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function hace(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  return `hace ${Math.round(minutos / 60)} h`
}

/**
 * El visor a pantalla completa.
 *
 * Es la única parte de la app con fondo negro, y lo es por una razón: aquí el
 * contenido es la foto y todo lo demás sobra. Fuera de esta pantalla el fondo
 * sigue siendo claro.
 *
 * El avance es por tiempo pero se puede tomar el control: tocar a los lados
 * salta, mantener pulsado pausa —para leer algo escrito en la foto— y arrastrar
 * hacia abajo cierra, que es el gesto que ya tiene aprendido cualquiera que
 * haya usado historias en otra app.
 */
export function StoryViewer({
  autores,
  indiceInicial,
  onCerrar,
  historiasFijas,
}: {
  autores: AutorConHistorias[]
  indiceInicial: number
  onCerrar: () => void
  /**
   * Historias ya resueltas, en vez de pedirlas a la base.
   *
   * Existe para poder mirar el visor sin sesión desde la vista de diseño. En la
   * app siempre va sin esto y las trae de la base.
   */
  historiasFijas?: Historia[]
}) {
  const [iAutor, setIAutor] = useState(indiceInicial)
  const [iHistoria, setIHistoria] = useState(0)
  const [historias, setHistorias] = useState<Historia[]>([])
  const [cargando, setCargando] = useState(true)
  const [pausado, setPausado] = useState(false)
  const [arrastre, setArrastre] = useState(0)

  const autor = autores[iAutor]
  const actual = historias[iHistoria]

  const inicioY = useRef<number | null>(null)
  const pulsadoEn = useRef(0)

  // ------------------------------------------------------------ navegación
  const siguienteAutor = useCallback(() => {
    if (iAutor + 1 < autores.length) {
      setIAutor((i) => i + 1)
      setIHistoria(0)
    } else {
      onCerrar()
    }
  }, [iAutor, autores.length, onCerrar])

  const anteriorAutor = useCallback(() => {
    if (iAutor > 0) {
      setIAutor((i) => i - 1)
      setIHistoria(0)
    }
  }, [iAutor])

  const siguiente = useCallback(() => {
    if (iHistoria + 1 < historias.length) setIHistoria((i) => i + 1)
    else siguienteAutor()
  }, [iHistoria, historias.length, siguienteAutor])

  const anterior = useCallback(() => {
    if (iHistoria > 0) setIHistoria((i) => i - 1)
    else anteriorAutor()
  }, [iHistoria, anteriorAutor])

  // ------------------------------------------------------------- carga
  useEffect(() => {
    if (historiasFijas) {
      setHistorias(historiasFijas)
      setIHistoria(0)
      setCargando(false)
      return
    }

    let vigente = true
    setCargando(true)
    historiasDe(autor.user_id)
      .then((lista) => {
        if (!vigente) return
        setHistorias(lista)
        // se entra por la primera sin ver: repetir lo ya visto es justo lo que
        // hace que la gente deje de abrir historias
        const primera = lista.findIndex((h) => !h.visto)
        setIHistoria(primera === -1 ? 0 : primera)
      })
      .catch(() => vigente && setHistorias([]))
      .finally(() => vigente && setCargando(false))

    return () => {
      vigente = false
    }
  }, [autor.user_id, historiasFijas])

  // --------------------------------------------------- marcar como vista
  useEffect(() => {
    if (actual && !actual.visto && !historiasFijas) verHistoria(actual.id)
  }, [actual, historiasFijas])

  // ------------------------------------------------------ avance automático
  useEffect(() => {
    if (!actual || pausado) return
    const t = setTimeout(siguiente, DURACION)
    return () => clearTimeout(t)
  }, [actual, pausado, siguiente])

  // ------------------------------------------------------------- teclado
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight') siguiente()
      if (e.key === 'ArrowLeft') anterior()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar, siguiente, anterior])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black touch-none select-none"
      style={{
        transform: `translateY(${arrastre}px)`,
        opacity: 1 - Math.min(arrastre / 300, 0.6),
        transition: arrastre === 0 ? 'transform .2s, opacity .2s' : undefined,
      }}
      onPointerDown={(e) => {
        inicioY.current = e.clientY
        pulsadoEn.current = Date.now()
        setPausado(true)
      }}
      onPointerMove={(e) => {
        if (inicioY.current === null) return
        const dy = e.clientY - inicioY.current
        if (dy > 0) setArrastre(dy)
      }}
      onPointerUp={(e) => {
        const dy = inicioY.current === null ? 0 : e.clientY - inicioY.current
        const rato = Date.now() - pulsadoEn.current
        inicioY.current = null
        setPausado(false)

        if (dy > CIERRE) {
          onCerrar()
          return
        }
        setArrastre(0)

        // un toque corto y sin arrastre es navegación; lo demás fue una pausa
        if (rato < 250 && Math.abs(dy) < 10) {
          const mitad = e.currentTarget.clientWidth / 2
          if (e.clientX < mitad) anterior()
          else siguiente()
        }
      }}
    >
      {/* progreso: un segmento por historia de esta persona */}
      <div className="flex gap-1 px-3 pt-3">
        {historias.map((h, i) => (
          <div key={h.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className={cn('h-full bg-white', i === iHistoria && !pausado && 'animate-[crecer_5s_linear]')}
              style={{
                width: i < iHistoria ? '100%' : i === iHistoria ? undefined : '0%',
                animationPlayState: pausado ? 'paused' : 'running',
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <Avatar className="size-8">
          {autor.foto_url && <AvatarImage src={autor.foto_url} alt="" />}
          <AvatarFallback className="text-xs">{iniciales(autor.nombre)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {autor.username ?? autor.nombre}
          </p>
          {actual && <p className="text-xs text-white/60">{hace(actual.created_at)}</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          className="p-1 text-white/80"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onCerrar}
        >
          <X className="size-6" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {cargando && <p className="text-sm text-white/60">Cargando…</p>}
        {!cargando && !actual && (
          <p className="px-8 text-center text-sm text-white/60">
            Esta persona ya no tiene historias activas.
          </p>
        )}
        {actual && (
          <img
            src={actual.imagen_url}
            alt=""
            draggable={false}
            className="max-h-full w-full object-contain"
          />
        )}
      </div>
    </div>
  )
}

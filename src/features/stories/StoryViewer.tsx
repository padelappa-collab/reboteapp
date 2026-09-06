import { Heart, Send, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/useAuth'
import { toast } from 'sonner'
import { conversacionCon, enviarMensaje } from '@/features/messages/messages.api'
import {
  alternarLikeHistoria,
  borrarHistoria,
  historiasDe,
  likesDeHistoria,
  verHistoria,
  yaDiMeGusta,
  type AutorConHistorias,
  type Historia,
} from './stories.api'
import type { LikeHistoriaRow } from '@/types/database'

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
  const [meGusta, setMeGusta] = useState(false)
  const [quienes, setQuienes] = useState<LikeHistoriaRow[] | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [mandando, setMandando] = useState(false)

  const { perfil } = useAuth()

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

  // -------------------------------------------- me gusta y quiénes lo dieron
  useEffect(() => {
    if (!actual || !perfil || historiasFijas) {
      setMeGusta(false)
      setQuienes(null)
      return
    }

    let vigente = true
    yaDiMeGusta(actual.id, perfil.id)
      .then((si) => vigente && setMeGusta(si))
      .catch(() => vigente && setMeGusta(false))

    // la lista solo la responde la base a quien publicó la historia
    if (autor.soy_yo) {
      likesDeHistoria(actual.id)
        .then((l) => vigente && setQuienes(l))
        .catch(() => vigente && setQuienes([]))
    } else {
      setQuienes(null)
    }

    return () => {
      vigente = false
    }
  }, [actual, perfil, autor.soy_yo, historiasFijas])

  /**
   * Quitar la historia que se está viendo.
   *
   * Después no se vuelve al principio: se pasa a la siguiente si queda alguna, y
   * si era la última se cierra el visor. Quedarse en una pantalla vacía después
   * de borrar es la forma más rápida de que alguien crea que no funcionó.
   */
  async function quitar() {
    if (!actual || borrando) return
    setBorrando(true)
    try {
      await borrarHistoria(actual.id)
      const quedan = historias.filter((h) => h.id !== actual.id)
      setHistorias(quedan)
      if (quedan.length === 0) onCerrar()
      else setIHistoria((i) => Math.min(i, quedan.length - 1))
      toast.success('Historia borrada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
    } finally {
      setBorrando(false)
    }
  }

  /**
   * Responder a una historia.
   *
   * Se manda como mensaje directo normal, que es lo que de verdad es: una
   * conversación con quien la publicó. Si todavía no existe, se crea sola.
   *
   * El texto se limpia antes de que la red conteste. Esperar a la respuesta para
   * vaciar el campo hace que parezca que el toque no registró y la gente lo
   * pulsa dos veces.
   */
  async function responder() {
    const texto = respuesta.trim()
    if (!texto || !perfil || mandando) return

    setMandando(true)
    setRespuesta('')
    try {
      const conv = await conversacionCon(autor.user_id)
      await enviarMensaje(conv, perfil.id, texto)
      toast.success('Mensaje enviado')
    } catch (error) {
      setRespuesta(texto)
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar')
    } finally {
      setMandando(false)
    }
  }

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
        // el visor tapa la pantalla entera: sus controles también tienen que
        // esquivar el notch y la barra de gestos
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
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
      {/*
        La foto es la pantalla, no un recuadro dentro de ella.
 
        Va al fondo y en `cover`, como en cualquier app de historias: las que se
        publican desde aquí ya vienen recortadas a 9:16, así que encaja exacta, y
        una traída de otro sitio se recorta antes que dejar franjas negras.
 
        No se puede seleccionar, ni arrastrar, ni mantener pulsado para guardar.
        No es por proteger nada —quien quiera se hace una captura— sino porque el
        gesto de mantener pulsado aquí significa "pausa", y si el sistema abre su
        menú de guardar encima, la pausa deja de funcionar.
      */}
      {actual && (
        <img
          src={actual.imagen_url}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-none absolute inset-0 size-full select-none object-cover"
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        />
      )}

      {/* progreso: un segmento por historia de esta persona */}
      <div className="relative z-10 flex gap-1 bg-gradient-to-b from-black/60 to-transparent px-3 pb-1 pt-3">
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

      <div className="relative z-10 flex items-center gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pb-4 pt-1">
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
        {/* borrar solo lo tuyo, y solo desde el visor: es donde estás viendo
            exactamente la historia que vas a quitar */}
        {autor.soy_yo && actual && !historiasFijas && (
          <button
            type="button"
            aria-label="Borrar esta historia"
            className="p-1 text-white/80 disabled:opacity-40"
            disabled={borrando}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={quitar}
          >
            <Trash2 className="size-5" />
          </button>
        )}

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
      </div>

      {/* Abajo cambia según de quién sea la historia: si es tuya, quién te la
          vio y le gustó; si es de otro, con qué responderle. */}
      {actual && autor.soy_yo && (
        <div
          className="relative z-10 max-h-40 space-y-2 overflow-y-auto bg-gradient-to-t from-black/70 to-transparent px-4 pb-5 pt-6"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-white/60">
            {quienes === null
              ? 'Cargando…'
              : quienes.length === 0
                ? 'Todavía nadie le ha dado me gusta'
                : `Le gustó a ${quienes.length}`}
          </p>
          {(quienes ?? []).map((q) => (
            <div key={q.user_id} className="flex items-center gap-2">
              <Avatar className="size-7">
                {q.foto_url && <AvatarImage src={q.foto_url} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {iniciales(q.nombre)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm text-white/90">
                {q.username ?? q.nombre}
              </span>
              <Heart className="ml-auto size-4 fill-primary text-primary" />
            </div>
          ))}
        </div>
      )}

      {actual && !autor.soy_yo && (
        <div
          className="relative z-10 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-5 pt-6"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <Input
            className="h-11 flex-1 rounded-full border-white/30 bg-transparent text-white placeholder:text-white/50"
            placeholder="Enviar mensaje"
            value={respuesta}
            disabled={mandando}
            onChange={(e) => setRespuesta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') responder()
            }}
          />

          {respuesta.trim() && (
            <button
              type="button"
              aria-label="Enviar"
              className="p-2 text-white disabled:opacity-40"
              disabled={mandando}
              onClick={responder}
            >
              <Send className="size-6" />
            </button>
          )}
          <button
            type="button"
            aria-label={meGusta ? 'Quitar me gusta' : 'Me gusta'}
            aria-pressed={meGusta}
            className="p-2"
            onClick={async () => {
              if (!perfil) return
              const nuevo = !meGusta
              setMeGusta(nuevo)
              try {
                await alternarLikeHistoria(actual.id, perfil.id, nuevo)
              } catch {
                setMeGusta(!nuevo)
              }
            }}
          >
            <Heart
              className={cn(
                'size-7 text-white transition-colors',
                meGusta && 'fill-primary text-primary',
              )}
            />
          </button>
        </div>
      )}
    </div>
  )
}

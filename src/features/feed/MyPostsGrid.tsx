import { Heart, ImageOff, MessageCircle, Swords, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import {
  borrarPublicacion,
  editarPublicacion,
  publicacionesDe,
  type Publicacion,
} from './feed.api'


/** Alto de la unidad de rejilla. Cuanto más fino, mejor encaja cada foto. */
const FILA = 4
const HUECO = 2

/**
 * Una celda de la rejilla, del alto que pida su foto.
 *
 * La rejilla es de tres columnas con filas de 4 px, y cada celda ocupa las filas
 * que necesite según la proporción de su imagen. Así una foto vertical se ve
 * entera y una apaisada ocupa menos, en vez de recortarlas todas a un cuadrado
 * y perder justo lo que la persona quiso encuadrar.
 *
 * El salto de filas se calcula al cargar la imagen, que es cuando se conocen
 * sus medidas reales, y se rehace al girar el teléfono porque ahí cambia el
 * ancho de la columna.
 */
function Celda({
  publicacion,
  onAbrir,
}: {
  publicacion: Publicacion
  onAbrir: () => void
}) {
  const caja = useRef<HTMLButtonElement>(null)
  const proporcion = useRef<number | null>(null)
  const [filas, setFilas] = useState<number | null>(null)

  const medir = useCallback(() => {
    const ancho = caja.current?.clientWidth
    if (!ancho || !proporcion.current) return
    const alto = ancho / proporcion.current
    setFilas(Math.max(1, Math.ceil((alto + HUECO) / (FILA + HUECO))))
  }, [])

  useEffect(() => {
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [medir])

  // sin foto no hay proporción que respetar: cuadrado y ya
  const cuadrada = !publicacion.imagen_url

  return (
    <button
      ref={caja}
      type="button"
      onClick={onAbrir}
      className={cn(
        'relative overflow-hidden bg-muted text-left',
        cuadrada && 'aspect-square',
      )}
      style={
        cuadrada || filas === null
          ? // hasta que se sepa la proporción, un cuadrado evita que la rejilla
            // salte de golpe cuando cargan las fotos
            { gridRow: `span ${Math.ceil((caja.current?.clientWidth ?? 120) / (FILA + HUECO))}` }
          : { gridRow: `span ${filas}` }
      }
    >
      {publicacion.imagen_url ? (
        <img
          src={publicacion.imagen_url}
          alt=""
          loading="lazy"
          className="w-full"
          onLoad={(e) => {
            const img = e.currentTarget
            proporcion.current = img.naturalWidth / img.naturalHeight
            medir()
          }}
        />
      ) : (
        <span className="flex size-full flex-col justify-between p-2">
          <span className="text-muted-foreground">
            {publicacion.match_id ? (
              <Swords className="size-4" />
            ) : (
              <ImageOff className="size-4" />
            )}
          </span>
          <span className="line-clamp-3 text-[11px] leading-tight">
            {publicacion.contenido ?? 'Partido'}
          </span>
        </span>
      )}

      {(publicacion.meGusta > 0 || publicacion.comentarios > 0) && (
        <span className="absolute bottom-1 right-1 flex gap-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px]">
          {publicacion.meGusta > 0 && (
            <span className="flex items-center gap-0.5">
              <Heart className="size-3" />
              {publicacion.meGusta}
            </span>
          )}
          {publicacion.comentarios > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageCircle className="size-3" />
              {publicacion.comentarios}
            </span>
          )}
        </span>
      )}
    </button>
  )
}

/** Cuadrícula de tus publicaciones, para revisarlas, editarlas o borrarlas. */
export function MyPostsGrid() {
  const { perfil } = useAuth()
  const [lista, setLista] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState<Publicacion | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!perfil) return
    setCargando(true)
    try {
      setLista(await publicacionesDe(perfil.id, perfil.id))
    } catch (error) {
      console.error('No se pudieron cargar tus publicaciones', error)
    } finally {
      setCargando(false)
    }
  }, [perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!perfil) return null
  if (cargando) return <Skeleton className="h-40 w-full" />

  function abrir(p: Publicacion) {
    setAbierta(p)
    setTexto(p.contenido ?? '')
  }

  async function guardar() {
    if (!abierta) return
    setEnviando(true)
    try {
      await editarPublicacion(abierta.id, texto.trim() || null)
      toast.success('Publicación actualizada')
      setAbierta(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setEnviando(false)
    }
  }

  async function borrar() {
    if (!abierta) return
    setEnviando(true)
    try {
      await borrarPublicacion(abierta.id)
      toast.success('Publicación borrada')
      setAbierta(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Sin tarjeta ni encabezado: la rejilla ES el contenido y va a lo ancho,
          como en cualquier perfil social. El contador vive arriba, en la fila de
          cifras, así que repetirlo aquí solo restaba sitio a las fotos. */}
      {lista.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no has publicado nada. Puedes subir una foto desde Social o
            publicar un partido desde su ficha.
          </p>
        </div>
      ) : (
        <div
          className="-mx-4 grid grid-cols-3 gap-0.5"
          style={{ gridAutoRows: `${FILA}px` }}
        >
          {lista.map((p) => (
            <Celda key={p.id} publicacion={p} onAbrir={() => abrir(p)} />
          ))}
        </div>
      )}

      <Sheet open={abierta !== null} onOpenChange={(v) => !v && setAbierta(null)}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar publicación</SheetTitle>
            <SheetDescription>
              Solo se puede cambiar el texto. La foto y el partido quedan como están.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 px-4 pb-6">
            {abierta?.imagen_url && (
              <img
                src={abierta.imagen_url}
                alt=""
                className="max-h-64 w-full rounded-lg object-cover"
              />
            )}

            <Textarea
              rows={4}
              maxLength={500}
              placeholder="Sin texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            <Button
              className="h-11 w-full"
              disabled={enviando || texto === (abierta?.contenido ?? '')}
              onClick={guardar}
            >
              Guardar cambios
            </Button>

            <Button
              variant="ghost"
              className="h-11 w-full text-destructive"
              disabled={enviando}
              onClick={borrar}
            >
              <Trash2 className="size-4" />
              Borrar publicación
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

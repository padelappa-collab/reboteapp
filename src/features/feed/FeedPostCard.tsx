import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ETIQUETA_RANKING } from '@/lib/matchType'
import { cn } from '@/lib/utils'
import { ShareSheet } from '@/features/messages/ShareSheet'
import { alternarMeGusta, borrarPublicacion, type Publicacion } from './feed.api'
import { CommentSheet } from './CommentSheet'

function hace(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias < 7) return `hace ${dias} d`
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function FeedPostCard({
  publicacion,
  usuarioId,
  onCambio,
}: {
  publicacion: Publicacion
  usuarioId: string
  onCambio: () => void
}) {
  // optimista: el corazón responde al toque, no a la red
  const [meGusta, setMeGusta] = useState(publicacion.yaDiMeGusta)
  const [cuantos, setCuantos] = useState(publicacion.meGusta)
  const [comentarios, setComentarios] = useState(false)
  const [latido, setLatido] = useState(false)
  const [compartir, setCompartir] = useState(false)

  const ultimoToque = useRef(0)

  const esMio = publicacion.user_id === usuarioId
  const partido = publicacion.partido
  const autor = publicacion.autor
  const nombreAutor = autor?.nombre ?? '…'

  async function cambiar(nuevo: boolean) {
    if (nuevo === meGusta) return
    setMeGusta(nuevo)
    setCuantos((n) => n + (nuevo ? 1 : -1))
    try {
      await alternarMeGusta(publicacion.id, usuarioId, nuevo)
    } catch {
      setMeGusta(!nuevo)
      setCuantos((n) => n + (nuevo ? -1 : 1))
      toast.error('No se pudo registrar el me gusta')
    }
  }

  /**
   * Doble toque sobre la foto.
   *
   * Solo da me gusta, nunca lo quita: quien toca dos veces está aplaudiendo, y
   * un doble toque accidental sobre algo que ya te gustaba no debería borrarlo.
   * Para quitarlo está el corazón de la fila de abajo, que refleja el mismo
   * estado.
   */
  function tocarImagen() {
    const ahora = Date.now()
    if (ahora - ultimoToque.current < 300) {
      ultimoToque.current = 0
      setLatido(true)
      setTimeout(() => setLatido(false), 900)
      if (!meGusta) cambiar(true)
    } else {
      ultimoToque.current = ahora
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* 1. quién y cuándo */}
      <div className="flex items-center gap-2.5 p-3">
        <Link to={`/jugador/${publicacion.user_id}`}>
          <UserAvatar
            id={publicacion.user_id}
            nombre={nombreAutor}
            fotoUrl={autor?.foto_url}
            className="size-8"
            textoClassName="text-xs"
          />
        </Link>

        <Link
          to={`/jugador/${publicacion.user_id}`}
          className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
        >
          {nombreAutor}
        </Link>

        <span className="shrink-0 text-xs text-muted-foreground">
          {hace(publicacion.created_at)}
        </span>

        {esMio && (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-1 size-8 shrink-0"
            aria-label="Borrar publicación"
            onClick={async () => {
              try {
                await borrarPublicacion(publicacion.id)
                toast.success('Publicación borrada')
                onCambio()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {/*
        2. La foto, con la forma que tenga.
 
        Sin recorte: la caja se adapta a la imagen y no al revés. Forzar un
        cuadrado obliga a encuadrar pensando en dónde va a cortar la app, y en
        una foto de cancha —que casi siempre es vertical o muy apaisada— eso
        significa perder media pista o los pies de la gente.
 
        El tope de alto es la única concesión: una foto muy alargada llenaría la
        pantalla entera y habría que hacer scroll para pasar de una publicación.
        Solo en ese caso se encaja dentro, sin cortar nada.
      */}
      {publicacion.imagen_url && (
        <div
          className="relative w-full overflow-hidden bg-muted"
          onPointerUp={tocarImagen}
        >
          <img
            src={publicacion.imagen_url}
            alt=""
            loading="lazy"
            draggable={false}
            className="mx-auto block max-h-[80dvh] w-full object-contain"
          />

          {latido && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              {/* neón y no rojo: el gesto es prestado, el color es nuestro */}
              <Heart
                className="size-28 animate-[latido_.9s_ease-out] fill-primary text-primary drop-shadow-lg"
                strokeWidth={1.5}
              />
            </span>
          )}
        </div>
      )}

      {/* el partido, cuando la publicación sale de uno */}
      {partido && (
        <Link
          to={`/partidos/${partido.id}`}
          className="mx-3 mt-3 block rounded-[var(--radius)] bg-muted/60 p-3"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Partido registrado
            </span>
            <Badge variant="outline" className="text-xs">
              {ETIQUETA_RANKING[partido.match_type]}
            </Badge>
          </div>
          {(['a', 'b'] as const).map((lado) => (
            <div key={lado} className="flex items-center justify-between">
              <span className={cn('text-xs', partido.ganador === lado && 'font-medium')}>
                {partido.ganador === lado ? 'Ganaron' : 'Perdieron'}
              </span>
              <span className="numero text-lg leading-none">
                {partido.sets.map((s) => s[lado]).join('  ')}
              </span>
            </div>
          ))}
        </Link>
      )}

      {/* 3. acciones */}
      <div className="flex items-center gap-1 px-2 pt-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={meGusta ? 'Quitar me gusta' : 'Me gusta'}
          aria-pressed={meGusta}
          onClick={() => cambiar(!meGusta)}
        >
          <Heart className={cn('size-6', meGusta && 'fill-primary text-primary')} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Comentarios"
          onClick={() => setComentarios(true)}
        >
          <MessageCircle className="size-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Compartir"
          onClick={() => setCompartir(true)}
        >
          <Send className="size-6" />
        </Button>
      </div>

      <div className="space-y-1 px-3 pb-3 pt-1.5">
        {/*
          4. Cuántos me gusta, y nada más.
 
          Los nombres de quienes lo dieron no salen aquí. Quien publicó puede
          verlos tocando el número; para el resto es solo una cifra, que es lo
          único que aporta al leer el feed.
        */}
        {cuantos > 0 &&
          (esMio ? (
            <Link
              to={`/publicacion/${publicacion.id}/megusta`}
              className="text-sm font-semibold hover:underline"
            >
              {cuantos === 1 ? '1 me gusta' : `${cuantos} me gusta`}
            </Link>
          ) : (
            <p className="text-sm font-semibold">
              {cuantos === 1 ? '1 me gusta' : `${cuantos} me gusta`}
            </p>
          ))}

        {/* 5. el pie, con el nombre pegado al texto */}
        {publicacion.contenido && (
          <p className="whitespace-pre-wrap text-sm">
            <Link
              to={`/jugador/${publicacion.user_id}`}
              className="font-semibold hover:underline"
            >
              {nombreAutor}
            </Link>{' '}
            {publicacion.contenido}
          </p>
        )}

        {/* 6. la conversación, si la hay */}
        {publicacion.comentarios > 2 && (
          <button
            type="button"
            className="text-sm text-muted-foreground"
            onClick={() => setComentarios(true)}
          >
            Ver los {publicacion.comentarios} comentarios
          </button>
        )}

        {/* 7. la fecha completa, en pequeño */}
        <p className="pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          {fechaLarga(publicacion.created_at)}
        </p>
      </div>

      <ShareSheet
        postId={publicacion.id}
        abierto={compartir}
        onAbrirChange={setCompartir}
      />

      <CommentSheet
        postId={publicacion.id}
        usuarioId={usuarioId}
        abierto={comentarios}
        onAbrirChange={setComentarios}
        onComentario={onCambio}
      />
    </Card>
  )
}

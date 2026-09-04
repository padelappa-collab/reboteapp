import { Heart, MessageCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ETIQUETA_RANKING } from '@/lib/matchType'
import { cn } from '@/lib/utils'
import { alternarMeGusta, borrarPublicacion, type Publicacion } from './feed.api'
import { CommentSheet } from './CommentSheet'

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
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias < 7) return `hace ${dias} d`
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
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

  const esMio = publicacion.user_id === usuarioId
  const partido = publicacion.partido

  async function alternar() {
    const nuevo = !meGusta
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

  async function borrar() {
    try {
      await borrarPublicacion(publicacion.id)
      toast.success('Publicación borrada')
      onCambio()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Link to={`/jugador/${publicacion.user_id}`}>
            <Avatar className="size-9">
              {publicacion.autor?.foto_url && (
                <AvatarImage src={publicacion.autor.foto_url} alt="" />
              )}
              <AvatarFallback className="text-xs">
                {iniciales(publicacion.autor?.nombre ?? '?')}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              to={`/jugador/${publicacion.user_id}`}
              className="truncate text-sm font-medium hover:underline"
            >
              {publicacion.autor?.nombre ?? '…'}
            </Link>
            <p className="text-xs text-muted-foreground">{hace(publicacion.created_at)}</p>
          </div>

          {esMio && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Borrar publicación"
              onClick={borrar}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        {publicacion.contenido && (
          <p className="whitespace-pre-wrap text-sm">{publicacion.contenido}</p>
        )}
      </CardContent>

      {publicacion.imagen_url && (
        <img
          src={publicacion.imagen_url}
          alt=""
          loading="lazy"
          className="max-h-[70vh] w-full object-cover"
        />
      )}

      <CardContent className="space-y-3">
        {partido && (
          <Link
            to={`/partidos/${partido.id}`}
            className="block rounded-lg border bg-muted/40 p-3 text-sm"
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
              <div
                key={lado}
                className={cn(
                  'flex justify-between',
                  partido.ganador === lado && 'font-medium',
                )}
              >
                <span className="text-xs">
                  {partido.ganador === lado ? 'Ganaron' : 'Perdieron'}
                </span>
                <span className="tabular-nums">
                  {partido.sets.map((s) => s[lado]).join('  ')}
                </span>
              </div>
            ))}
          </Link>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={alternar}>
            <Heart
              className={cn('size-4', meGusta && 'fill-destructive text-destructive')}
            />
            {cuantos > 0 && <span className="text-xs tabular-nums">{cuantos}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setComentarios(true)}
          >
            <MessageCircle className="size-4" />
            {publicacion.comentarios > 0 && (
              <span className="text-xs tabular-nums">{publicacion.comentarios}</span>
            )}
          </Button>
        </div>
      </CardContent>

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

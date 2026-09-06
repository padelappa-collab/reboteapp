import { ArrowLeft, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { UserAvatar } from '@/components/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import type { LikeHistoriaRow } from '@/types/database'
import { likesDePost } from './feed.api'

/**
 * Quiénes le dieron me gusta a una publicación tuya.
 *
 * Tiene pantalla propia y no una hoja dentro del feed porque es una lista que
 * puede ser larga y que no se consulta al vuelo: se entra a mirarla.
 *
 * Si la publicación no es tuya, la base no devuelve nada. La regla vive ahí y no
 * aquí: esconder el enlace en la interfaz no impediría escribir la dirección a
 * mano.
 */
export default function PostLikesPage() {
  const { id } = useParams<{ id: string }>()
  const [lista, setLista] = useState<LikeHistoriaRow[] | null>(null)

  useEffect(() => {
    if (!id) return
    let vigente = true
    likesDePost(id)
      .then((l) => vigente && setLista(l))
      .catch(() => vigente && setLista([]))
    return () => {
      vigente = false
    }
  }, [id])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Link
          to={`/publicacion/${id}`}
          aria-label="Volver a la publicación"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Me gusta</h1>
        {lista && lista.length > 0 && (
          <span className="numero ml-auto text-lg">{lista.length}</span>
        )}
      </div>

      {lista === null && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {lista?.length === 0 && (
        <EmptyState
          icono={Heart}
          titulo="Todavía nadie"
          texto="Cuando alguien le dé me gusta a esta publicación, aparecerá aquí. Solo tú ves esta lista."
        />
      )}

      {lista && lista.length > 0 && (
        <div className="divide-y overflow-hidden rounded-[var(--radius)] bg-card">
          {lista.map((l) => (
            <Link
              key={l.user_id}
              to={`/jugador/${l.user_id}`}
              className="flex items-center gap-3 p-3"
            >
              <UserAvatar
                id={l.user_id}
                nombre={l.nombre}
                fotoUrl={l.foto_url}
                className="size-10"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {l.username ?? l.nombre}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {l.nombre}
                </span>
              </span>
              <Heart className="size-4 shrink-0 fill-primary text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

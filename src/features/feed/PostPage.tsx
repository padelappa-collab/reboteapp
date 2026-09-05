import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { publicacionPorId, type Publicacion } from './feed.api'
import { FeedPostCard } from './FeedPostCard'

/**
 * Una publicación sola.
 *
 * Es a donde lleva una publicación compartida por mensaje. Antes se abría el
 * perfil del autor, con sus insignias, su ELO y todo lo demás: quien toca una
 * foto que le acaban de mandar quiere ver esa foto, no ponerse a buscarla entre
 * las otras veinte de alguien.
 */
export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const [post, setPost] = useState<Publicacion | null | undefined>(undefined)

  const cargar = useCallback(async () => {
    if (!id || !perfil) return
    try {
      setPost(await publicacionPorId(id, perfil.id))
    } catch (error) {
      console.error('No se pudo cargar la publicación', error)
      setPost(null)
    }
  }, [id, perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!perfil) return null

  return (
    <div className="space-y-4 pb-4">
      <button
        type="button"
        onClick={() => history.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </button>

      {post === undefined && <Skeleton className="h-96 w-full" />}

      {post === null && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Esta publicación ya no está. Puede que su autor la haya borrado, o
            que su cuenta sea privada y no la sigas.
          </p>
          <Link to="/social" className="mt-3 inline-block text-sm underline">
            Volver a Social
          </Link>
        </div>
      )}

      {post && (
        <FeedPostCard publicacion={post} usuarioId={perfil.id} onCambio={cargar} />
      )}
    </div>
  )
}

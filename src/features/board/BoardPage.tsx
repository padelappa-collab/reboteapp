import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { CreatePostSheet } from './CreatePostSheet'
import { PostCard } from './PostCard'
import { useBoard } from './useBoard'

export default function BoardPage() {
  const { perfil } = useAuth()
  const { publicaciones, cargando, error, recargar } = useBoard(perfil?.ciudad)

  const abiertas = publicaciones.filter((p) => p.estado === 'abierto')

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tablón</h1>
        <CreatePostSheet onCreada={recargar} />
      </div>

      <p className="text-sm text-muted-foreground">
        Quién busca con quién jugar en {perfil?.ciudad}.
      </p>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!cargando && abiertas.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay publicaciones abiertas. Publica la primera y que te encuentren.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {abiertas.map((p) => (
          <PostCard
            key={p.id}
            publicacion={p}
            usuarioId={perfil!.id}
            onCambio={recargar}
          />
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
import type { PublicacionConDatos } from './board.api'
import { CreatePostSheet } from './CreatePostSheet'
import { PostCard, quienesVan } from './PostCard'
import { useBoard } from './useBoard'

type Pestana = 'abiertas' | 'mias'

/** Estoy metido si publiqué, si ya iba, o si me apunté. */
function esMia(p: PublicacionConDatos, userId: string) {
  return (
    p.user_id === userId ||
    p.acompanantes.includes(userId) ||
    p.apuntados.some((a) => a.id === userId)
  )
}

export default function BoardPage() {
  const { perfil } = useAuth()
  const { publicaciones, cargando, error, recargar } = useBoard(perfil?.ciudad)
  const [pestana, setPestana] = useState<Pestana>('abiertas')

  const yo = perfil?.id ?? ''
  const hayCupo = (p: PublicacionConDatos) =>
    quienesVan(p).length < 4 && p.estado !== 'cancelado'
  const abiertas = publicaciones.filter(hayCupo)
  // aquí sí entran las cerradas: cuando el cupo se llena hay que poder seguir
  // viendo el partido al que entraste, y registrarlo
  const mias = publicaciones.filter((p) => esMia(p, yo))

  const lista = pestana === 'abiertas' ? abiertas : mias

  const vacio =
    pestana === 'abiertas'
      ? 'No hay publicaciones abiertas. Publica la primera y que te encuentren.'
      : 'No estás en ninguna publicación. Apúntate a alguna o crea la tuya.'

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tablón</h1>
        <CreatePostSheet onCreada={recargar} />
      </div>

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
        <TabsList className="w-full">
          <TabsTrigger value="abiertas" className="flex-1">
            Abiertas
            {abiertas.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {abiertas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mias" className="flex-1">
            En las que estoy
            {mias.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {mias.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!cargando && lista.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{vacio}</p>
        </div>
      )}

      <div className="space-y-3">
        {lista.map((p) => (
          <PostCard key={p.id} publicacion={p} usuarioId={yo} onCambio={recargar} />
        ))}
      </div>
    </div>
  )
}

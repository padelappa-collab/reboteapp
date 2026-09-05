import { useCallback, useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
import { CreatePostSheet } from './CreatePostSheet'
import { StoriesBar } from '@/features/stories/StoriesBar'
import { UserSearch } from './UserSearch'
import { FeedPostCard } from './FeedPostCard'
import { publicaciones, type Publicacion } from './feed.api'

type Pestana = 'siguiendo' | 'descubrir'

export default function SocialPage() {
  const { perfil } = useAuth()
  // al arrancar el piloto casi nadie sigue a nadie, así que Descubrir es lo
  // primero que se ve; si no, el feed estaría vacío y nadie volvería
  const [pestana, setPestana] = useState<Pestana>('descubrir')
  const [lista, setLista] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    if (!perfil) return
    setCargando(true)
    try {
      setLista(await publicaciones(perfil.id, pestana, perfil.ciudad))
    } catch (error) {
      console.error('No se pudo cargar el feed', error)
      setLista([])
    } finally {
      setCargando(false)
    }
  }, [perfil, pestana])

  useEffect(() => {
    recargar()
  }, [recargar])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Social</h1>
        <CreatePostSheet onCreada={recargar} />
      </div>

      <UserSearch />

      {/* las historias van arriba del feed: son lo que caduca, y lo que caduca
          se mira primero */}
      <StoriesBar />

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
        <TabsList className="w-full">
          <TabsTrigger value="descubrir" className="flex-1">
            Descubrir
          </TabsTrigger>
          <TabsTrigger value="siguiendo" className="flex-1">
            Siguiendo
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!cargando && lista.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {pestana === 'siguiendo'
              ? 'Todavía no sigues a nadie que haya publicado. Búscalos aquí arriba.'
              : `Aún no hay publicaciones en ${perfil?.ciudad}. Publica la primera.`}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {lista.map((p) => (
          <FeedPostCard
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

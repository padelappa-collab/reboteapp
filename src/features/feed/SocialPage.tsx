import { MessageCircle, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { mensajesSinLeer } from '@/features/messages/messages.api'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
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
  const [sinLeer, setSinLeer] = useState(0)

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

  // el punto de mensajes sin leer: se recuenta al entrar a Social, que es el
  // momento en que la persona está mirando esta barra
  useEffect(() => {
    mensajesSinLeer()
      .then(setSinLeer)
      .catch(() => setSinLeer(0))
  }, [])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Social</h1>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              sinLeer > 0 ? `Mensajes, ${sinLeer} sin leer` : 'Mensajes'
            }
          >
            <Link to="/mensajes">
              <MessageCircle className="size-5" />
              {sinLeer > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link to="/publicar">
              <Plus className="size-4" />
              Publicar
            </Link>
          </Button>
        </div>
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

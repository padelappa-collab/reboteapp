import { ArrowLeft, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { BadgeGrid } from '@/features/badges/BadgeGrid'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/types/database'
import {
  dejarDeSeguir,
  publicacionesDe,
  relacionCon,
  seguir,
  type Publicacion,
  type RelacionSeguimiento,
} from './feed.api'
import { FeedPostCard } from './FeedPostCard'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Perfil público de otro jugador: su nivel, sus insignias y su feed. */
export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()

  const [jugador, setJugador] = useState<UserRow | null>(null)
  const [relacion, setRelacion] = useState<RelacionSeguimiento | null>(null)
  const [posts, setPosts] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!id || !perfil) return
    setCargando(true)
    try {
      const [{ data }, rel] = await Promise.all([
        supabase.from('users').select('*').eq('id', id).maybeSingle(),
        relacionCon(id, perfil.id),
      ])
      setJugador(data)
      setRelacion(rel)
      // si no puede ver el feed, la base devuelve una lista vacía
      setPosts(await publicacionesDe(id, perfil.id))
    } finally {
      setCargando(false)
    }
  }, [id, perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (cargando) return <Skeleton className="h-96 w-full" />
  if (!jugador) return <p className="text-sm text-muted-foreground">Jugador no encontrado.</p>

  const soyYo = jugador.id === perfil?.id
  const estado = relacion?.estado ?? null
  const eloBase = jugador.genero === 'masculino' ? jugador.elo_masculino : jugador.elo_femenino
  const peakBase =
    jugador.genero === 'masculino' ? jugador.peak_elo_masculino : jugador.peak_elo_femenino

  // el candado se muestra cuando hay cuenta privada y no la sigo
  const oculto = jugador.cuenta_privada && !soyYo && estado !== 'aceptado'

  async function alternarSeguir() {
    if (!perfil || !id) return
    setEnviando(true)
    try {
      if (estado) {
        await dejarDeSeguir(id, perfil.id)
      } else {
        const nuevo = await seguir(id)
        toast.success(
          nuevo === 'pendiente' ? 'Solicitud enviada' : `Ahora sigues a ${jugador!.nombre}`,
        )
      }
      setRelacion(await relacionCon(id, perfil.id))
      setPosts(await publicacionesDe(id, perfil.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <Link
        to="/feed"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <div className="flex items-center gap-3">
        <Avatar className="size-16">
          {jugador.foto_url && <AvatarImage src={jugador.foto_url} alt="" />}
          <AvatarFallback>{iniciales(jugador.nombre)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{jugador.nombre}</h1>
          {jugador.username && (
            <p className="truncate text-sm text-muted-foreground">@{jugador.username}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {jugador.ciudad} · {relacion?.seguidores ?? 0} seguidores
          </p>
          {eloBase !== null && peakBase !== null && (
            <CategoryBadge
              elo={eloBase}
              ranking={jugador.genero}
              peakElo={peakBase}
              className="mt-1"
            />
          )}
        </div>
      </div>

      {!soyYo && (
        <Button
          className="h-11 w-full"
          variant={estado ? 'outline' : 'default'}
          disabled={enviando}
          onClick={alternarSeguir}
        >
          {estado === 'aceptado'
            ? 'Siguiendo'
            : estado === 'pendiente'
              ? 'Solicitud enviada'
              : 'Seguir'}
        </Button>
      )}

      {oculto ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Lock className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Esta cuenta es privada</p>
            <p className="text-sm text-muted-foreground">
              Sigue a {jugador.nombre} para ver sus publicaciones. Su ranking y sus
              partidos siguen siendo públicos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <BadgeGrid userId={jugador.id} />

          {posts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {soyYo ? 'Todavía no has publicado nada.' : 'Todavía no ha publicado nada.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <FeedPostCard
                  key={p.id}
                  publicacion={p}
                  usuarioId={perfil!.id}
                  onCambio={cargar}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

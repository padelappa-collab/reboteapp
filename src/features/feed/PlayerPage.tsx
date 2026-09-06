import { ArrowLeft, Bell, BellOff, Lock, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { BadgeGrid } from '@/features/badges/BadgeGrid'
import { EloCard } from '@/features/profile/EloCard'
import { ProfileStats } from '@/features/profile/ProfileStats'
import { UserAvatar } from '@/components/UserAvatar'
import { StoryViewer } from '@/features/stories/StoryViewer'
import { historiasDe, type Historia } from '@/features/stories/stories.api'
import { cn } from '@/lib/utils'
import { conversacionCon } from '@/features/messages/messages.api'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/types/database'
import {
  alternarAvisosDe,
  dejarDeSeguir,
  publicacionesDe,
  relacionCon,
  seguir,
  type Publicacion,
  type RelacionSeguimiento,
} from './feed.api'
import { FeedPostCard } from './FeedPostCard'

/** Perfil público de otro jugador: su nivel, sus insignias y su feed. */
export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const navegar = useNavigate()

  const [jugador, setJugador] = useState<UserRow | null>(null)
  const [relacion, setRelacion] = useState<RelacionSeguimiento | null>(null)
  const [posts, setPosts] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [historias, setHistorias] = useState<Historia[]>([])
  const [viendo, setViendo] = useState(false)

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

  // sus historias activas: solo las devuelve la base si puedes verlas
  useEffect(() => {
    if (!id) return
    let vigente = true
    historiasDe(id)
      .then((h) => vigente && setHistorias(h))
      .catch(() => vigente && setHistorias([]))
    return () => {
      vigente = false
    }
  }, [id])

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

  async function alternarAvisos() {
    if (!perfil || !id || !relacion) return
    const activo = !relacion.avisos
    setEnviando(true)
    try {
      await alternarAvisosDe(id, activo)
      setRelacion({ ...relacion, avisos: activo })
      toast.success(
        activo
          ? `Te avisaremos cuando ${jugador!.nombre} publique`
          : 'Ya no te avisaremos de sus publicaciones',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <Link
        to="/social"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      {/* mismo orden que tu propio perfil: quién es, sus números, y lo que
          publica. Que la ficha de otro se lea distinta a la tuya obliga a
          reaprender la pantalla cada vez que cambias de una a otra. */}
      <div className="flex items-center gap-3">
        {/*
          La foto abre sus historias, como en cualquier app social. El anillo
          solo aparece si de verdad tiene alguna activa: un anillo permanente
          deja de significar nada y la gente toca en vano.
        */}
        {historias.length > 0 ? (
          <button
            type="button"
            aria-label={`Ver las historias de ${jugador.nombre}`}
            className="shrink-0 rounded-full"
            onClick={() => setViendo(true)}
          >
            <UserAvatar
              id={jugador.id}
              nombre={jugador.nombre}
              fotoUrl={jugador.foto_url}
              className={cn(
                'size-16 ring-2 ring-offset-2 ring-offset-background',
                historias.some((h) => !h.visto) ? 'ring-anillo' : 'ring-border',
              )}
            />
          </button>
        ) : (
          <UserAvatar
            id={jugador.id}
            nombre={jugador.nombre}
            fotoUrl={jugador.foto_url}
            className="size-16"
          />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{jugador.nombre}</h1>
          <p className="truncate text-sm text-muted-foreground">@{jugador.username}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {eloBase !== null && peakBase !== null && (
              <CategoryBadge elo={eloBase} ranking={jugador.genero} peakElo={peakBase} />
            )}
            <span className="numero text-sm">{eloBase ?? jugador.elo_mixto}</span>
            <span className="text-xs text-muted-foreground">· {jugador.ciudad}</span>
          </div>
        </div>
      </div>

      <ProfileStats userId={jugador.id} />

      {!soyYo && (
        <div className="flex gap-2">
          <Button
            className="h-11 flex-1"
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

          {/* la misma regla que aplica la base: a quien sigues, o a cualquier
              cuenta pública. Enseñar el botón cuando va a fallar es peor que no
              enseñarlo */}
          {(estado === 'aceptado' || !jugador.cuenta_privada) && (
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              disabled={enviando}
              aria-label="Enviarle un mensaje"
              onClick={async () => {
                if (!id) return
                try {
                  navegar(`/mensajes/${await conversacionCon(id)}`)
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'No se pudo abrir el chat',
                  )
                }
              }}
            >
              <MessageCircle className="size-4" />
            </Button>
          )}

          {/* Los avisos de publicaciones se piden de a uno. Sin esto habría que
              elegir entre saberlo todo de todos o no saber nada de nadie. */}
          {estado === 'aceptado' && (
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              disabled={enviando}
              aria-label={
                relacion?.avisos
                  ? 'Dejar de avisarme de sus publicaciones'
                  : 'Avisarme cuando publique'
              }
              onClick={alternarAvisos}
            >
              {relacion?.avisos ? (
                <Bell className="size-4 text-court" />
              ) : (
                <BellOff className="size-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
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
          {posts.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed p-8 text-center">
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

          <div className="h-px bg-border" />

          {/* el ELO y las insignias cierran, igual que en tu perfil */}
          <div className="space-y-3">
            {eloBase !== null && peakBase !== null && (
              <EloCard ranking={jugador.genero} elo={eloBase} peakElo={peakBase} />
            )}
            <EloCard
              ranking="mixto"
              elo={jugador.elo_mixto}
              peakElo={jugador.peak_elo_mixto}
            />
          </div>

          <BadgeGrid userId={jugador.id} />
        </>
      )}

      {viendo && jugador && (
        <StoryViewer
          autores={[
            {
              user_id: jugador.id,
              nombre: jugador.nombre,
              username: jugador.username,
              foto_url: jugador.foto_url,
              total: historias.length,
              sin_ver: historias.filter((h) => !h.visto).length,
              ultima: historias[historias.length - 1]?.created_at ?? '',
              soy_yo: soyYo,
            },
          ]}
          indiceInicial={0}
          onCerrar={() => {
            setViendo(false)
            // al volver, las que acabas de ver ya no llevan anillo
            historiasDe(jugador.id).then(setHistorias).catch(() => {})
          }}
        />
      )}
    </div>
  )
}

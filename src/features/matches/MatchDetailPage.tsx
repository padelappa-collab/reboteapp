import {
  CalendarDays,
  Check,
  CircleAlert,
  LogOut,
  MapPin,
  Share2,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { CreatePostSheet } from '@/features/feed/CreatePostSheet'
import { useCourts } from '@/features/courts/useCourts'
import { ETIQUETA_RANKING } from '@/lib/matchType'
import { cn } from '@/lib/utils'
import type { MatchEstado, MatchRow, RankingTipo, SetMarcador } from '@/types/database'
import {
  cancelarPartido,
  confirmarPartido,
  corregirMarcador,
  disputarPartido,
} from './matches.api'
import type { JugadorResumen } from './matches.api'
import { marcadorValido, SetsInput } from './SetsInput'
import { usePartido } from './useMatches'

const ESTADO: Record<MatchEstado, { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente de confirmar', clase: 'bg-amber-100 text-amber-900' },
  confirmado: { texto: 'Confirmado', clase: 'bg-primary/10 text-primary' },
  disputado: { texto: 'En disputa', clase: 'bg-destructive/10 text-destructive' },
  cancelado: { texto: 'Cancelado', clase: 'bg-muted text-muted-foreground' },
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** El ELO del jugador en el ranking que mueve este partido. */
function eloDe(j: JugadorResumen, ranking: RankingTipo) {
  if (ranking === 'masculino') return { elo: j.elo_masculino, pico: j.peak_elo_masculino }
  if (ranking === 'femenino') return { elo: j.elo_femenino, pico: j.peak_elo_femenino }
  return { elo: j.elo_mixto, pico: j.peak_elo_mixto }
}

/** Una pareja de la ficha: los dos jugadores, su nivel y si ya confirmaron. */
function FilaJugador({
  jugador,
  ranking,
  confirmado,
  esYo,
}: {
  jugador: JugadorResumen | undefined
  ranking: RankingTipo
  confirmado: boolean
  esYo: boolean
}) {
  if (!jugador) {
    return <p className="text-sm text-muted-foreground">Jugador no encontrado</p>
  }

  const { elo, pico } = eloDe(jugador, ranking)

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        <AvatarFallback className="text-xs">{iniciales(jugador.nombre)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {jugador.nombre}
          {esYo && <span className="text-muted-foreground"> (tú)</span>}
        </p>
        {elo !== null && pico !== null && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <CategoryBadge elo={elo} ranking={ranking} peakElo={pico} />
            <span className="text-xs tabular-nums text-muted-foreground">{elo}</span>
          </div>
        )}
      </div>

      {confirmado ? (
        <span
          className="flex items-center gap-1 text-xs text-primary"
          title="Confirmó el resultado"
        >
          <Check className="size-4" />
          confirmó
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">pendiente</span>
      )}
    </div>
  )
}

function Pareja({
  partido,
  lado,
  jugadores,
  yo,
}: {
  partido: MatchRow
  lado: 'a' | 'b'
  jugadores: Map<string, JugadorResumen>
  yo: string
}) {
  const ids = lado === 'a' ? partido.pareja_a : partido.pareja_b
  const gano = partido.ganador === lado
  const juegos = partido.sets.map((s) => s[lado])

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border p-3',
        gano && partido.estado === 'confirmado' && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {gano && <Trophy className="size-3.5 text-primary" />}
          {gano ? 'Ganadores' : 'Perdedores'}
        </span>
        <span className="flex gap-1.5 tabular-nums">
          {juegos.map((j, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex size-7 items-center justify-center rounded text-sm',
                gano ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              {j}
            </span>
          ))}
        </span>
      </div>

      {ids.map((id) => (
        <FilaJugador
          key={id}
          jugador={jugadores.get(id)}
          ranking={partido.match_type}
          confirmado={partido.resultado_confirmado_por.includes(id)}
          esYo={id === yo}
        />
      ))}
    </div>
  )
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil, refrescarPerfil } = useAuth()
  const { partido, jugadores, cargando, setPartido } = usePartido(id)
  const { canchas } = useCourts()
  const [enviando, setEnviando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [setsNuevos, setSetsNuevos] = useState<SetMarcador[] | null>(null)

  if (cargando) return <Skeleton className="h-96 w-full" />
  if (!partido) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>
  }

  const yo = perfil!.id
  const soyJugador = [...partido.pareja_a, ...partido.pareja_b].includes(yo)
  const yaConfirme = partido.resultado_confirmado_por.includes(yo)
  const faltan = 4 - partido.resultado_confirmado_por.length
  const cancha = canchas.find((c) => c.id === partido.cancha_id)
  const estado = ESTADO[partido.estado]

  async function confirmar() {
    setEnviando(true)
    try {
      const actualizado = await confirmarPartido(partido!.id)
      setPartido(actualizado)
      if (actualizado.estado === 'confirmado') {
        await refrescarPerfil()
        toast.success('Confirmado por los cuatro. El ELO ya se actualizó.')
      } else {
        toast.success('Confirmaste. Faltan los demás.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo confirmar')
    } finally {
      setEnviando(false)
    }
  }

  async function disputar() {
    setEnviando(true)
    try {
      setPartido(await disputarPartido(partido!.id))
      toast.info('Marcado en disputa. Cualquiera de los cuatro puede corregir el marcador.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo disputar')
    } finally {
      setEnviando(false)
    }
  }

  async function guardarCorreccion() {
    if (!setsNuevos) return
    setEnviando(true)
    try {
      setPartido(await corregirMarcador(partido!.id, setsNuevos))
      setCorrigiendo(false)
      toast.success('Marcador corregido. Los otros tres tienen que confirmar de nuevo.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo corregir')
    } finally {
      setEnviando(false)
    }
  }

  async function salirme() {
    setEnviando(true)
    try {
      setPartido(await cancelarPartido(partido!.id))
      toast.info('Saliste del partido.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo salir')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Ficha del partido</h1>
        <Badge variant="outline">{ETIQUETA_RANKING[partido.match_type]}</Badge>
        <Badge variant="outline" className={estado.clase}>
          {estado.texto}
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            {new Date(partido.fecha).toLocaleString('es-CO', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            {cancha?.nombre ?? 'Cancha sin especificar'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiénes jugaron</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Pareja partido={partido} lado="a" jugadores={jugadores} yo={yo} />
          <Pareja partido={partido} lado="b" jugadores={jugadores} yo={yo} />

          {partido.estado === 'pendiente' && (
            <p className="text-xs text-muted-foreground">
              El ELO se mueve cuando confirmen los cuatro. Faltan {faltan}.
            </p>
          )}

          {partido.estado === 'confirmado' && (
            <p className="text-xs text-primary">
              El ranking {ETIQUETA_RANKING[partido.match_type].toLowerCase()} ya se
              actualizó con este resultado.
            </p>
          )}

          {partido.estado === 'cancelado' && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {partido.cancelado_por === yo
                ? 'Saliste de este partido, así que no cuenta para el ranking.'
                : `${jugadores.get(partido.cancelado_por ?? '')?.nombre ?? 'Un jugador'} salió del partido, así que no cuenta para el ranking.`}
            </p>
          )}

          {partido.estado === 'disputado' && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              Alguien no está de acuerdo con el marcador. Cualquiera de los cuatro
              puede corregirlo; al hacerlo, los demás tienen que confirmar de nuevo.
            </p>
          )}
        </CardContent>
      </Card>

      {soyJugador && partido.estado === 'confirmado' && (
        <Card>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">¿Lo subes al feed?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Se publica con el marcador y los jugadores. Puedes añadirle una foto, o
                dejarlo solo con el resultado. Nada se publica sin que tú lo decidas.
              </p>
            </div>
            <CreatePostSheet
              matchId={partido.id}
              onCreada={() => toast.success('Publicado en tu feed')}
              disparador={
                <Button variant="outline" className="h-11 w-full">
                  <Share2 className="size-4" />
                  Publicar este partido
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {soyJugador && partido.estado === 'disputado' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Corregir el marcador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {corrigiendo ? (
              <>
                <SetsInput
                  sets={setsNuevos ?? partido.sets}
                  onChange={setSetsNuevos}
                  etiquetaA={partido.pareja_a
                    .map((id) => jugadores.get(id)?.nombre ?? '…')
                    .join(' y ')}
                  etiquetaB={partido.pareja_b
                    .map((id) => jugadores.get(id)?.nombre ?? '…')
                    .join(' y ')}
                />

                {marcadorValido(setsNuevos ?? partido.sets) && (
                  <p className="text-sm text-destructive">
                    {marcadorValido(setsNuevos ?? partido.sets)}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    className="h-11 flex-1"
                    disabled={
                      enviando || Boolean(marcadorValido(setsNuevos ?? partido.sets))
                    }
                    onClick={guardarCorreccion}
                  >
                    Guardar marcador
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={enviando}
                    onClick={() => {
                      setCorrigiendo(false)
                      setSetsNuevos(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => {
                  setSetsNuevos(partido.sets)
                  setCorrigiendo(true)
                }}
              >
                Corregir el marcador
              </Button>
            )}

            <Button
              variant="ghost"
              className="h-11 w-full text-destructive"
              disabled={enviando}
              onClick={salirme}
            >
              <LogOut className="size-4" />
              Salir del partido
            </Button>
          </CardContent>
        </Card>
      )}

      {soyJugador && partido.estado === 'pendiente' && (
        <div className="grid gap-2">
          {!yaConfirme && (
            <Button className="h-11 w-full" disabled={enviando} onClick={confirmar}>
              Confirmar resultado
            </Button>
          )}
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={enviando}
            onClick={disputar}
          >
            No estoy de acuerdo con el marcador
          </Button>
          <Button
            variant="ghost"
            className="h-11 w-full text-destructive"
            disabled={enviando}
            onClick={salirme}
          >
            <LogOut className="size-4" />
            Salir del partido
          </Button>
        </div>
      )}
    </div>
  )
}

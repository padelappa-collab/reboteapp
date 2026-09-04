import { ArrowLeft, CalendarDays, Check, MapPin, Trophy, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { useCourts } from '@/features/courts/useCourts'
import { PlayerPicker } from '@/features/matches/PlayerPicker'
import type { JugadorResumen } from '@/features/matches/matches.api'
import { marcadorValido, SetsInput } from '@/features/matches/SetsInput'
import { cn } from '@/lib/utils'
import type { SetMarcador } from '@/types/database'
import {
  aceptarInscripcion,
  crucesDe,
  ETIQUETA_ESTADO,
  ETIQUETA_FORMATO,
  finalizarTorneo,
  generarFaseFinal,
  iniciarTorneo,
  inscribirPareja,
  obtenerTorneo,
  parejasDe,
  parejasValidas,
  registrarResultado,
  retirarPareja,
  tablaDePosiciones,
  type Cruce,
  type Pareja,
  type Torneo,
} from './tournaments.api'

function nombrePareja(p: Pareja | undefined) {
  if (!p) return 'Por definir'
  return p.jugadores.map((j) => j?.nombre ?? '…').join(' y ')
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const { canchas } = useCourts()

  const [torneo, setTorneo] = useState<Torneo | null>(null)
  const [parejas, setParejas] = useState<Pareja[]>([])
  const [cruces, setCruces] = useState<Cruce[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const [companero, setCompanero] = useState<JugadorResumen[]>([])
  const [registrando, setRegistrando] = useState<string | null>(null)
  const [sets, setSets] = useState<SetMarcador[]>([{ a: 6, b: 4 }])

  const cargar = useCallback(async () => {
    if (!id) return
    setCargando(true)
    try {
      const [t, p, c] = await Promise.all([obtenerTorneo(id), parejasDe(id), crucesDe(id)])
      setTorneo(t)
      setParejas(p)
      setCruces(c)
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (cargando) return <Skeleton className="h-96 w-full" />
  if (!torneo) return <p className="text-sm text-muted-foreground">Torneo no encontrado.</p>

  const yo = perfil!.id
  const soyOrganizador = torneo.creado_por === yo
  const aceptadas = parejas.filter((p) => p.estado === 'aceptada')
  const miPareja = parejas.find((p) => p.jugador_a === yo || p.jugador_b === yo)
  const meInvitaron = parejas.find((p) => p.jugador_b === yo && p.estado === 'pendiente')
  const cancha = canchas.find((c) => c.id === torneo.cancha_id)
  const errorParejas = parejasValidas(torneo.formato, aceptadas.length)
  const porJugar = cruces.filter((c) => !c.ganador_id).length

  const grupos = [...new Set(cruces.filter((c) => c.grupo).map((c) => c.grupo!))].sort()
  const parejaPorId = new Map(parejas.map((p) => [p.id, p]))

  async function accion(fn: () => Promise<unknown>, exito: string) {
    setEnviando(true)
    try {
      await fn()
      toast.success(exito)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar')
    } finally {
      setEnviando(false)
    }
  }

  function CruceCard({ c }: { c: Cruce }) {
    const a = c.pareja_a_id ? parejaPorId.get(c.pareja_a_id) : undefined
    const b = c.pareja_b_id ? parejaPorId.get(c.pareja_b_id) : undefined
    const jugado = Boolean(c.ganador_id)
    const editando = registrando === c.id

    return (
      <div className="rounded-lg border p-3">
        <div className="space-y-1 text-sm">
          {([a, b] as const).map((p, i) => (
            <div
              key={i}
              className={cn(
                'flex justify-between gap-2',
                jugado && c.ganador_id === p?.id && 'font-medium',
              )}
            >
              <span className="truncate">{b ? nombrePareja(p) : nombrePareja(a)}</span>
              {c.sets && (
                <span className="shrink-0 tabular-nums">
                  {c.sets.map((s) => (i === 0 ? s.a : s.b)).join(' ')}
                </span>
              )}
            </div>
          ))}
          {!b && (
            <p className="text-xs text-muted-foreground">Pasa sin jugar</p>
          )}
        </div>

        {soyOrganizador && !jugado && b && (
          <div className="mt-3">
            {editando ? (
              <div className="space-y-3">
                <SetsInput
                  sets={sets}
                  onChange={setSets}
                  etiquetaA={nombrePareja(a)}
                  etiquetaB={nombrePareja(b)}
                />
                {marcadorValido(sets) && (
                  <p className="text-sm text-destructive">{marcadorValido(sets)}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    className="h-10 flex-1"
                    disabled={enviando || Boolean(marcadorValido(sets))}
                    onClick={() =>
                      accion(async () => {
                        await registrarResultado(c.id, sets)
                        setRegistrando(null)
                      }, 'Resultado registrado')
                    }
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => setRegistrando(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full"
                onClick={() => {
                  setSets([{ a: 6, b: 4 }])
                  setRegistrando(c.id)
                }}
              >
                Registrar resultado
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  function Tabla({ grupo }: { grupo?: number | null }) {
    const filas = tablaDePosiciones(parejas, cruces, grupo)
    if (filas.length === 0) return null

    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 text-left font-medium">Pareja</th>
            <th className="w-10 py-1 text-center font-medium">PJ</th>
            <th className="w-10 py-1 text-center font-medium">PG</th>
            <th className="w-12 py-1 text-center font-medium">Sets</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.pareja.id} className={cn(i === 0 && 'font-medium')}>
              <td className="truncate py-1">{nombrePareja(f.pareja)}</td>
              <td className="py-1 text-center tabular-nums">{f.jugados}</td>
              <td className="py-1 text-center tabular-nums">{f.ganados}</td>
              <td className="py-1 text-center tabular-nums">
                {f.setsAFavor}–{f.setsEnContra}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <Link
        to="/torneos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torneos
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{torneo.nombre}</h1>
        <Badge variant="outline">{ETIQUETA_FORMATO[torneo.formato]}</Badge>
        <Badge variant="secondary" className="capitalize">
          {torneo.ranking} {torneo.categoria}
        </Badge>
        <Badge variant="outline">{ETIQUETA_ESTADO[torneo.estado]}</Badge>
      </div>

      <Card>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            {new Date(torneo.fecha_inicio).toLocaleString('es-CO', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            {cancha?.nombre ?? 'Cancha por definir'}
          </p>
          <p className="flex items-center gap-2">
            <Trophy className="size-4 shrink-0" />
            {aceptadas.length} de {torneo.max_parejas} parejas
          </p>
          {torneo.descripcion && (
            <p className="pt-1 text-foreground">{torneo.descripcion}</p>
          )}
        </CardContent>
      </Card>

      {meInvitaron && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">
                {parejas.find((p) => p.id === meInvitaron.id)?.jugadores[0]?.nombre ??
                  'Alguien'}
              </span>{' '}
              te inscribió como su pareja.
            </p>
            <div className="flex gap-2">
              <Button
                className="h-10 flex-1"
                disabled={enviando}
                onClick={() =>
                  accion(() => aceptarInscripcion(meInvitaron.id), 'Inscripción aceptada')
                }
              >
                <Check className="size-4" />
                Aceptar
              </Button>
              <Button
                variant="outline"
                className="h-10 flex-1"
                disabled={enviando}
                onClick={() => accion(() => retirarPareja(meInvitaron.id), 'Rechazada')}
              >
                <X className="size-4" />
                Rechazar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {torneo.estado === 'inscripciones' && !miPareja && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscribirse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PlayerPicker
              etiqueta="Tu pareja"
              seleccionados={companero}
              yaElegidos={[yo, ...companero.map((j) => j.id)]}
              onChange={setCompanero}
              maximo={1}
            />
            <Button
              className="h-11 w-full"
              disabled={enviando || companero.length !== 1}
              onClick={() =>
                accion(async () => {
                  await inscribirPareja(torneo.id, companero[0].id)
                  setCompanero([])
                }, 'Inscripción enviada. Falta que tu pareja acepte.')
              }
            >
              Inscribir pareja
            </Button>
            <p className="text-xs text-muted-foreground">
              Tu compañero tiene que aceptar para que la inscripción quede en firme.
              Los dos tienen que estar en la categoría {torneo.categoria} o a punto de
              entrar en ella.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parejas inscritas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {parejas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nadie se ha inscrito todavía.</p>
          )}
          {parejas.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{nombrePareja(p)}</span>
              {p.grupo && <Badge variant="secondary">Grupo {p.grupo}</Badge>}
              {p.estado === 'pendiente' && <Badge variant="outline">Sin confirmar</Badge>}
              {p.id === miPareja?.id && torneo.estado === 'inscripciones' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  disabled={enviando}
                  onClick={() => accion(() => retirarPareja(p.id), 'Te retiraste')}
                >
                  Retirarme
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {soyOrganizador && torneo.estado === 'inscripciones' && (
        <div className="space-y-2">
          <Button
            className="h-11 w-full"
            disabled={enviando || Boolean(errorParejas)}
            onClick={() => accion(() => iniciarTorneo(torneo.id), 'Torneo iniciado')}
          >
            Sortear y empezar
          </Button>
          {errorParejas && <p className="text-sm text-destructive">{errorParejas}</p>}
        </div>
      )}

      {cruces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {torneo.formato === 'grupos' ? 'Grupos' : 'Partidos'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {grupos.length > 1 ? (
              grupos.map((g) => (
                <div key={g} className="space-y-3">
                  <p className="text-sm font-medium">Grupo {g}</p>
                  <Tabla grupo={g} />
                  <div className="space-y-2">
                    {cruces
                      .filter((c) => c.grupo === g)
                      .map((c) => (
                        <CruceCard key={c.id} c={c} />
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <>
                <Tabla />
                <div className="space-y-2">
                  {cruces
                    .filter((c) => c.fase === 'grupos')
                    .map((c) => (
                      <CruceCard key={c.id} c={c} />
                    ))}
                </div>
              </>
            )}

            {cruces.some((c) => c.fase === 'final') && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Fase final</p>
                {cruces
                  .filter((c) => c.fase === 'final')
                  .map((c) => (
                    <CruceCard key={c.id} c={c} />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {soyOrganizador && torneo.estado === 'en_curso' && (
        <div className="space-y-2">
          {torneo.formato === 'grupos' && (
            <Button
              variant="outline"
              className="h-11 w-full"
              disabled={enviando || porJugar > 0}
              onClick={() =>
                accion(() => generarFaseFinal(torneo.id), 'Siguiente fase generada')
              }
            >
              Generar siguiente fase
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-11 w-full"
            disabled={enviando || porJugar > 0}
            onClick={() => accion(() => finalizarTorneo(torneo.id), 'Torneo finalizado')}
          >
            Dar por terminado
          </Button>
          {porJugar > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Faltan {porJugar} partidos por registrar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/useAuth'
import { vincularPartido } from '@/features/board/board.api'
import { useCourts } from '@/features/courts/useCourts'
import { ETIQUETA_RANKING, inferirMatchType } from '@/lib/matchType'
import type { SetMarcador } from '@/types/database'
import { crearPartido, perfilesDe, type JugadorResumen } from './matches.api'
import { PlayerPicker } from './PlayerPicker'
import { marcadorValido, setsGanados, SetsInput } from './SetsInput'

const SIN_CANCHA = 'sin-cancha'

/** Un ISO de la base al formato que espera un input datetime-local. */
function paraInput(iso: string) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function fechaLocalAhora() {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 16)
}

/** Lo que manda el tablón cuando se completa un cupo. */
interface DesdeTablon {
  jugadores?: string[]
  canchaId?: string | null
  fecha?: string
  postId?: string
}

export default function CreateMatchPage() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const { canchas } = useCourts(perfil?.ciudad)
  const desdeTablon = (useLocation().state ?? {}) as DesdeTablon

  // quien registra el partido siempre juega: la RLS lo exige
  const yo: JugadorResumen | null = perfil
    ? {
        id: perfil.id,
        nombre: `${perfil.nombre} (tú)`,
        ciudad: perfil.ciudad,
        genero: perfil.genero,
        elo_masculino: perfil.elo_masculino,
        elo_femenino: perfil.elo_femenino,
        elo_mixto: perfil.elo_mixto,
        peak_elo_masculino: perfil.peak_elo_masculino,
        peak_elo_femenino: perfil.peak_elo_femenino,
        peak_elo_mixto: perfil.peak_elo_mixto,
        partidos_jugados: perfil.partidos_jugados,
      }
    : null

  const [fecha, setFecha] = useState(
    desdeTablon.fecha ? paraInput(desdeTablon.fecha) : fechaLocalAhora(),
  )
  const [canchaId, setCanchaId] = useState<string>(desdeTablon.canchaId ?? SIN_CANCHA)
  const [parejaA, setParejaA] = useState<JugadorResumen[]>(yo ? [yo] : [])
  const [parejaB, setParejaB] = useState<JugadorResumen[]>([])
  const [sets, setSets] = useState<SetMarcador[]>([
    { a: 6, b: 4 },
    { a: 6, b: 4 },
  ])
  const [enviando, setEnviando] = useState(false)

  // el tablón manda los cuatro ids; hay que traer sus perfiles y repartirlos
  useEffect(() => {
    const ids = desdeTablon.jugadores
    if (!ids || ids.length !== 4 || !perfil) return

    let vigente = true
    perfilesDe(ids).then((perfiles) => {
      if (!vigente) return
      const jugadores = ids
        .map((id) => perfiles.get(id))
        .filter((j): j is JugadorResumen => Boolean(j))
      if (jugadores.length !== 4) return

      // quien registra va siempre en la pareja A
      const yoPrimero = [
        ...jugadores.filter((j) => j.id === perfil.id),
        ...jugadores.filter((j) => j.id !== perfil.id),
      ]
      setParejaA(yoPrimero.slice(0, 2))
      setParejaB(yoPrimero.slice(2, 4))
    })

    return () => {
      vigente = false
    }
  }, [desdeTablon.jugadores, perfil])

  const elegidos = [...parejaA, ...parejaB]
  const ids = elegidos.map((j) => j.id)

  // Elegir en una pareja saca al jugador de la otra: nadie puede estar dos
  // veces en el mismo partido, y la base lo rechazaria de todas formas.
  function elegirParejaA(nuevos: JugadorResumen[]) {
    setParejaA(nuevos)
    setParejaB((otros) => otros.filter((j) => !nuevos.some((n) => n.id === j.id)))
  }

  function elegirParejaB(nuevos: JugadorResumen[]) {
    setParejaB(nuevos)
    setParejaA((otros) => otros.filter((j) => !nuevos.some((n) => n.id === j.id)))
  }
  const completo = parejaA.length === 2 && parejaB.length === 2

  const tipo = useMemo(() => {
    if (!completo) return null
    try {
      return inferirMatchType(elegidos.map((j) => j.genero))
    } catch {
      return null
    }
  }, [completo, elegidos])

  const errorMarcador = marcadorValido(sets)
  const ganados = setsGanados(sets)

  // los nombres reales encima de cada columna del marcador
  const nombresDe = (pareja: JugadorResumen[], porDefecto: string) =>
    pareja.length === 0
      ? porDefecto
      : pareja.map((j) => j.nombre.replace(' (tú)', '')).join(' y ')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!perfil || !completo || errorMarcador) return

    setEnviando(true)
    try {
      const partido = await crearPartido({
        fecha: new Date(fecha).toISOString(),
        canchaId: canchaId === SIN_CANCHA ? null : canchaId,
        creadoPor: perfil.id,
        parejaA: [parejaA[0].id, parejaA[1].id],
        parejaB: [parejaB[0].id, parejaB[1].id],
        sets,
      })
      // dejar constancia de que salió de esa publicación; si falla, el partido
      // ya quedó registrado y eso es lo que importa
      if (desdeTablon.postId) {
        try {
          await vincularPartido(desdeTablon.postId, partido.id)
        } catch (error) {
          console.error('No se pudo enlazar la publicación con el partido', error)
        }
      }

      toast.success('Partido registrado. Faltan las confirmaciones de los otros 3.')
      navegar(`/partidos/${partido.id}`, { replace: true })
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo registrar'
      // el trigger de la base devuelve el aviso ya redactado para el jugador
      toast.error(mensaje, { duration: 6000 })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold">Registrar partido</h1>

      {desdeTablon.jugadores && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Vienen del tablón. Acomoda las parejas si no quedaron como jugaron.
        </p>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fecha">Cuándo</Label>
            <Input
              id="fecha"
              type="datetime-local"
              className="h-11"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cancha">Dónde</Label>
            <Select value={canchaId} onValueChange={setCanchaId}>
              <SelectTrigger id="cancha" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_CANCHA}>Sin especificar</SelectItem>
                {canchas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jugadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PlayerPicker
            etiqueta="Tu pareja"
            seleccionados={parejaA}
            yaElegidos={ids}
            onChange={elegirParejaA}
          />
          <PlayerPicker
            etiqueta="Pareja rival"
            seleccionados={parejaB}
            yaElegidos={ids}
            onChange={elegirParejaB}
          />

          {tipo && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Este partido cuenta para</span>
              <Badge>{ETIQUETA_RANKING[tipo]}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <SetsInput
            sets={sets}
            onChange={setSets}
            etiquetaA={nombresDe(parejaA, 'Tu pareja')}
            etiquetaB={nombresDe(parejaB, 'Pareja rival')}
          />

          {errorMarcador ? (
            <p className="text-sm text-destructive">{errorMarcador}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ganan{' '}
              <span className="font-medium text-foreground">
                {ganados.a > ganados.b
                  ? nombresDe(parejaA, 'tú y tu pareja')
                  : nombresDe(parejaB, 'los rivales')}
              </span>{' '}
              por {Math.max(ganados.a, ganados.b)}–{Math.min(ganados.a, ganados.b)} en
              sets.
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={enviando || !completo || Boolean(errorMarcador)}
      >
        {enviando ? 'Guardando…' : 'Registrar partido'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        El ELO se mueve solo cuando los 4 jugadores confirmen el resultado.
      </p>
    </form>
  )
}

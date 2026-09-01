import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useCourts } from '@/features/courts/useCourts'
import { ETIQUETA_RANKING, inferirMatchType } from '@/lib/matchType'
import type { SetMarcador } from '@/types/database'
import { crearPartido, type JugadorResumen } from './matches.api'
import { PlayerPicker } from './PlayerPicker'
import { marcadorValido, setsGanados, SetsInput } from './SetsInput'

const SIN_CANCHA = 'sin-cancha'

function fechaLocalAhora() {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 16)
}

export default function CreateMatchPage() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const { canchas } = useCourts(perfil?.ciudad)

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

  const [fecha, setFecha] = useState(fechaLocalAhora())
  const [canchaId, setCanchaId] = useState<string>(SIN_CANCHA)
  const [parejaA, setParejaA] = useState<JugadorResumen[]>(yo ? [yo] : [])
  const [parejaB, setParejaB] = useState<JugadorResumen[]>([])
  const [sets, setSets] = useState<SetMarcador[]>([
    { a: 6, b: 4 },
    { a: 6, b: 4 },
  ])
  const [enviando, setEnviando] = useState(false)

  const elegidos = [...parejaA, ...parejaB]
  const ids = elegidos.map((j) => j.id)
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
      toast.success('Partido registrado. Faltan las confirmaciones de los otros 3.')
      navegar(`/partidos/${partido.id}`, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold">Registrar partido</h1>

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
            onChange={setParejaA}
          />
          <PlayerPicker
            etiqueta="Pareja rival"
            seleccionados={parejaB}
            yaElegidos={ids}
            onChange={setParejaB}
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
          <SetsInput sets={sets} onChange={setSets} />

          {errorMarcador ? (
            <p className="text-sm text-destructive">{errorMarcador}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ganan {ganados.a > ganados.b ? 'tú y tu pareja' : 'los rivales'} por{' '}
              {Math.max(ganados.a, ganados.b)}–{Math.min(ganados.a, ganados.b)} en sets.
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

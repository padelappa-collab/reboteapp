import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/useAuth'
import {
  CATEGORIAS_FEMENINO,
  CATEGORIAS_MASCULINO,
  categoriaDesdeElo,
} from '@/lib/categories'
import { useCourts } from '@/features/courts/useCourts'
import { cn } from '@/lib/utils'
import type { RankingTipo } from '@/types/database'
import {
  crearTorneo,
  ETIQUETA_FORMATO,
  EXPLICACION_FORMATO,
  type TorneoFormato,
} from './tournaments.api'

const SIN_CANCHA = 'sin-cancha'

/** Cuántas parejas tiene sentido admitir en cada formato. */
const OPCIONES_PAREJAS: Record<TorneoFormato, number[]> = {
  americano: [3, 4, 5, 6, 7, 8],
  cuadrangular: [4, 8, 16, 32],
  grupos: [8, 12, 16, 20, 24, 32],
}

function enUnaSemana() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(9, 0, 0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function CreateTournamentPage() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const { canchas } = useCourts(perfil?.ciudad)

  const [nombre, setNombre] = useState('')
  const [formato, setFormato] = useState<TorneoFormato>('americano')
  const [fecha, setFecha] = useState(enUnaSemana())
  const [canchaId, setCanchaId] = useState(SIN_CANCHA)
  const [maxParejas, setMaxParejas] = useState(8)
  const [ranking, setRanking] = useState<RankingTipo>(perfil?.genero ?? 'masculino')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)

  // la categoría propia, para sugerirla al organizador
  const miElo =
    ranking === 'masculino'
      ? perfil?.elo_masculino
      : ranking === 'femenino'
        ? perfil?.elo_femenino
        : perfil?.elo_mixto
  const miPico =
    ranking === 'masculino'
      ? perfil?.peak_elo_masculino
      : ranking === 'femenino'
        ? perfil?.peak_elo_femenino
        : perfil?.peak_elo_mixto
  const miCategoria =
    miElo != null && miPico != null ? categoriaDesdeElo(miElo, ranking, miPico) : null

  function cambiarFormato(nuevo: TorneoFormato) {
    setFormato(nuevo)
    // cada formato admite cantidades distintas; se ajusta sola
    const opciones = OPCIONES_PAREJAS[nuevo]
    if (!opciones.includes(maxParejas)) setMaxParejas(opciones[0])
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!perfil) return

    setEnviando(true)
    try {
      const torneo = await crearTorneo({
        nombre,
        ciudad: perfil.ciudad,
        formato,
        ranking,
        categoria,
        fechaInicio: new Date(fecha).toISOString(),
        canchaId: canchaId === SIN_CANCHA ? null : canchaId,
        descripcion: descripcion.trim() || null,
        maxParejas,
        creadoPor: perfil.id,
      })
      toast.success('Torneo creado. Ya se pueden inscribir.')
      navegar(`/torneos/${torneo.id}`, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold">Crear torneo</h1>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre-torneo">Nombre</Label>
            <Input
              id="nombre-torneo"
              className="h-11"
              required
              minLength={3}
              maxLength={80}
              placeholder="Americano de sábado en Bocagrande"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Formato</Label>
            <div className="grid gap-2">
              {(['americano', 'cuadrangular', 'grupos'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => cambiarFormato(f)}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left',
                    formato === f ? 'border-primary bg-primary/10' : 'hover:bg-accent',
                  )}
                >
                  <span className="block text-sm font-medium">
                    {ETIQUETA_FORMATO[f]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {EXPLICACION_FORMATO[f]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Ranking</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['masculino', 'femenino', 'mixto'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRanking(r)
                    setCategoria('')
                  }}
                  className={cn(
                    'rounded-lg border px-2 py-3 text-sm capitalize',
                    ranking === r ? 'border-primary bg-primary/10' : 'hover:bg-accent',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoria-torneo">Categoría</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="categoria-torneo" className="h-11 w-full">
                <SelectValue placeholder="Elige la categoría" />
              </SelectTrigger>
              <SelectContent>
                {(ranking === 'femenino'
                  ? CATEGORIAS_FEMENINO
                  : CATEGORIAS_MASCULINO
                ).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se pueden inscribir quienes están en esa categoría y quienes están a
              punto de subir o bajar a ella (75 puntos de margen).
              {miCategoria && ` La tuya es ${miCategoria}.`}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parejas-torneo">Cuántas parejas</Label>
            <Select
              value={String(maxParejas)}
              onValueChange={(v) => setMaxParejas(Number(v))}
            >
              <SelectTrigger id="parejas-torneo" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCIONES_PAREJAS[formato].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} parejas
                    {formato === 'grupos' && ` · ${n / 4} grupos`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cuando estén inscritas, la app las reparte al azar.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fecha-torneo">Cuándo empieza</Label>
            <Input
              id="fecha-torneo"
              type="datetime-local"
              className="h-11"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cancha-torneo">Dónde</Label>
            <Select value={canchaId} onValueChange={setCanchaId}>
              <SelectTrigger id="cancha-torneo" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_CANCHA}>Por definir</SelectItem>
                {canchas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc-torneo">Detalles (opcional)</Label>
            <Textarea
              id="desc-torneo"
              rows={3}
              maxLength={400}
              placeholder="Inscripción, premios, hora de llegada…"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={enviando || nombre.trim().length < 3 || !categoria}
      >
        {enviando ? 'Creando…' : 'Crear torneo'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Los partidos del torneo cuentan para el ranking, igual que los demás.
      </p>
    </form>
  )
}

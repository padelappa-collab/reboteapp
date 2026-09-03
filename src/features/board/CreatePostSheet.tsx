import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/useAuth'
import { useCourts } from '@/features/courts/useCourts'
import { PlayerPicker } from '@/features/matches/PlayerPicker'
import type { JugadorResumen } from '@/features/matches/matches.api'
import { CATEGORIAS_FEMENINO, CATEGORIAS_MASCULINO } from '@/lib/categories'
import { crearPublicacion } from './board.api'

const SIN_CANCHA = 'sin-cancha'
const CUALQUIER_NIVEL = 'cualquiera'

function enUnaHora() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function CreatePostSheet({ onCreada }: { onCreada: () => void }) {
  const { perfil } = useAuth()
  const { canchas } = useCourts(perfil?.ciudad)

  const [abierto, setAbierto] = useState(false)
  const [acompanantes, setAcompanantes] = useState<JugadorResumen[]>([])
  const [fecha, setFecha] = useState(enUnaHora())
  const [nivel, setNivel] = useState(CUALQUIER_NIVEL)
  const [canchaId, setCanchaId] = useState(SIN_CANCHA)
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)

  const categorias =
    perfil?.genero === 'femenino' ? CATEGORIAS_FEMENINO : CATEGORIAS_MASCULINO

  const faltan = 3 - acompanantes.length

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!perfil) return

    setEnviando(true)
    try {
      await crearPublicacion({
        userId: perfil.id,
        acompanantes: acompanantes.map((j) => j.id),
        fechaPartido: new Date(fecha).toISOString(),
        nivelBuscado: nivel === CUALQUIER_NIVEL ? null : nivel,
        canchaId: canchaId === SIN_CANCHA ? null : canchaId,
        nota: nota.trim() || null,
      })
      toast.success('Publicado en el tablón')
      setAbierto(false)
      setNota('')
      setAcompanantes([])
      onCreada()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Publicar
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Buscar jugadores</SheetTitle>
          <SheetDescription>
            Los demás verán tu publicación y podrán apuntarse.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={enviar} className="grid gap-4 px-4 pb-6">
          <div className="grid gap-2">
            <PlayerPicker
              etiqueta="¿Quién más va contigo?"
              seleccionados={acompanantes}
              yaElegidos={[perfil?.id ?? '', ...acompanantes.map((j) => j.id)]}
              onChange={setAcompanantes}
              maximo={2}
            />
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">
                {faltan === 1 ? 'Falta 1 jugador' : `Faltan ${faltan} jugadores`}
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Si vas solo, déjalo vacío. Quienes ya van contigo tienen que estar
                registrados para que después el partido cuente para el ranking.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fecha-post">Cuándo</Label>
            <Input
              id="fecha-post"
              type="datetime-local"
              className="h-11"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cancha-post">Dónde</Label>
            <Select value={canchaId} onValueChange={setCanchaId}>
              <SelectTrigger id="cancha-post" className="h-11 w-full">
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
            <Label htmlFor="nivel-post">Nivel que buscas</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger id="nivel-post" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUALQUIER_NIVEL}>Cualquiera</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nota-post">Nota (opcional)</Label>
            <Textarea
              id="nota-post"
              rows={3}
              maxLength={280}
              placeholder="Jugamos relajado pero con ganas"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

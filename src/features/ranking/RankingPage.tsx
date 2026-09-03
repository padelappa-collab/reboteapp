import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import type { RankingTipo } from '@/types/database'
import { useRanking } from './useRanking'

const TODAS = 'todas'
const CIUDADES = ['Cartagena']

/** Sin tildes ni mayúsculas, para que "nuñez" encuentre a "Núñez". */
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function RankingPage() {
  const { perfil } = useAuth()
  const [tipo, setTipo] = useState<RankingTipo>(perfil?.genero ?? 'masculino')
  const [ciudad, setCiudad] = useState<string>(perfil?.ciudad ?? TODAS)
  const { filas, cargando } = useRanking(tipo, ciudad === TODAS ? null : ciudad)
  const [busqueda, setBusqueda] = useState('')

  // La posición se calcula sobre la tabla completa, no sobre lo filtrado: si
  // buscas a alguien tienes que ver en qué puesto está de verdad.
  const visibles = useMemo(() => {
    const conPuesto = filas.map((fila, i) => ({ fila, puesto: i + 1 }))
    if (!busqueda.trim()) return conPuesto
    const texto = normalizar(busqueda)
    return conPuesto.filter((f) => normalizar(f.fila.nombre).includes(texto))
  }, [filas, busqueda])

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold">Ranking</h1>

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as RankingTipo)}>
        <TabsList className="w-full">
          <TabsTrigger value="masculino" className="flex-1">
            Masculino
          </TabsTrigger>
          <TabsTrigger value="femenino" className="flex-1">
            Femenino
          </TabsTrigger>
          <TabsTrigger value="mixto" className="flex-1">
            Mixto
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={ciudad} onValueChange={setCiudad}>
        <SelectTrigger className="h-11 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas las ciudades</SelectItem>
          {CIUDADES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9 pr-10"
          placeholder="Buscar jugador"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Limpiar búsqueda"
            className="absolute right-1 top-1/2 size-9 -translate-y-1/2"
            onClick={() => setBusqueda('')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {cargando && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!cargando && visibles.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {busqueda.trim()
              ? `Nadie con ese nombre en el ranking ${tipo}.`
              : 'Todavía no hay jugadores en este ranking.'}
          </p>
        </div>
      )}

      <ol className="divide-y rounded-lg border">
        {visibles.map(({ fila, puesto }) => (
          <li
            key={fila.id}
            className={cn(
              'flex items-center gap-3 p-3',
              fila.id === perfil?.id && 'bg-primary/5',
            )}
          >
            <span className="w-6 text-center text-sm font-medium tabular-nums text-muted-foreground">
              {puesto}
            </span>
            <Avatar className="size-9">
              <AvatarFallback className="text-xs">{iniciales(fila.nombre)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fila.nombre}</p>
              <CategoryBadge
                elo={fila.elo}
                ranking={tipo}
                peakElo={fila.peakElo}
                className="mt-0.5"
              />
            </div>
            <span className="text-base font-semibold tabular-nums">{fila.elo}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

import { useState } from 'react'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

      {cargando && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!cargando && filas.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay jugadores en este ranking.
          </p>
        </div>
      )}

      <ol className="divide-y rounded-lg border">
        {filas.map((fila, i) => (
          <li
            key={fila.id}
            className={cn(
              'flex items-center gap-3 p-3',
              fila.id === perfil?.id && 'bg-primary/5',
            )}
          >
            <span className="w-6 text-center text-sm font-medium tabular-nums text-muted-foreground">
              {i + 1}
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

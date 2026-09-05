import { Link } from 'react-router-dom'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Ranking } from '@/lib/categories'
import { cn } from '@/lib/utils'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Una fila del ranking.
 *
 * El ELO va grande y en su propia tipografía, y el nombre en cuerpo de texto.
 * Es al revés de lo que pide el instinto, pero quien abre el ranking viene a
 * comparar cifras: el nombre solo sirve para saber de quién es la cifra.
 */
export function RankingRow({
  id,
  puesto,
  nombre,
  elo,
  peakElo,
  ranking,
  fotoUrl,
  soyYo,
}: {
  id: string
  puesto: number
  nombre: string
  elo: number
  peakElo: number
  ranking: Ranking
  fotoUrl?: string | null
  soyYo?: boolean
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 p-3',
        // tu propia fila destacada: el único uso del neón en esta lista
        soyYo && 'bg-primary/15',
      )}
    >
      <span className="numero w-7 text-center text-sm text-muted-foreground">
        {puesto}
      </span>

      <Avatar className="size-9">
        {fotoUrl && <AvatarImage src={fotoUrl} alt="" />}
        <AvatarFallback className="text-xs">{iniciales(nombre)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <Link
          to={`/jugador/${id}`}
          className="block truncate text-sm font-medium hover:underline"
        >
          {nombre}
        </Link>
        <CategoryBadge elo={elo} ranking={ranking} peakElo={peakElo} className="mt-0.5" />
      </div>

      <span className="numero text-2xl leading-none">{elo}</span>
    </li>
  )
}

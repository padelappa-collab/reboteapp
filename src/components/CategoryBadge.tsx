import { Badge } from '@/components/ui/badge'
import { StarLevel } from '@/components/StarLevel'
import { categoriaDesdeElo, nivelEstrella, type Ranking } from '@/lib/categories'
import { cn } from '@/lib/utils'

/**
 * Categoría + estrellas, calculadas desde el ELO. Se usa igual en los tres
 * rankings: el mixto también tiene categoría, con los cortes masculinos.
 */
export function CategoryBadge({
  elo,
  ranking,
  peakElo,
  className,
}: {
  elo: number
  ranking: Ranking
  peakElo: number
  className?: string
}) {
  const categoria = categoriaDesdeElo(elo, ranking, peakElo)
  const estrellas = nivelEstrella(elo, ranking, peakElo)

  return (
    <Badge variant="secondary" className={cn('gap-1 font-mono', className)}>
      {categoria}
      <StarLevel nivel={estrellas} />
    </Badge>
  )
}

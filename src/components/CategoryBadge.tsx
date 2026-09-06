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
    // Tinte del verde de marca al 15% en vez de gris neutro: la categoría es de
    // lo que más se repite en la app, y ese poco de color hace que la marca esté
    // presente sin que ninguna pantalla se llene de neón.
    <Badge
      variant="secondary"
      className={cn('gap-1 border-primary/25 bg-primary/15 text-foreground', className)}
    >
      {categoria}
      <StarLevel nivel={estrellas} />
    </Badge>
  )
}

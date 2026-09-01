import { CategoryBadge } from '@/components/CategoryBadge'
import { Card, CardContent } from '@/components/ui/card'
import { resumenCategoria, type Ranking } from '@/lib/categories'

const TITULO: Record<Ranking, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  mixto: 'Mixto',
}

/** Una de las tres tarjetas de ELO del perfil. */
export function EloCard({
  ranking,
  elo,
  peakElo,
}: {
  ranking: Ranking
  elo: number
  peakElo: number
}) {
  const resumen = resumenCategoria(elo, ranking, peakElo)

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {TITULO[ranking]}
          </span>
          <CategoryBadge elo={elo} ranking={ranking} peakElo={peakElo} />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{elo}</span>
          {peakElo > elo && (
            <span className="text-xs text-muted-foreground">pico {peakElo}</span>
          )}
        </div>

        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(resumen.progreso * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {resumen.faltaParaSubir === null
              ? 'Categoría más alta de la escala'
              : `${resumen.faltaParaSubir} puntos para subir de categoría`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

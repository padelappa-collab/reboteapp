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
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {TITULO[ranking]}
            </p>
            {/* El ELO es lo que la persona viene a mirar: va primero, grande y
                con su propia tipografia. El resto de la tarjeta lo acompaña. */}
            <p className="numero mt-1 text-5xl leading-none">{elo}</p>
          </div>
          <CategoryBadge elo={elo} ranking={ranking} peakElo={peakElo} />
        </div>

        {peakElo > elo && (
          <p className="text-xs text-muted-foreground">
            Tu máximo fue <span className="numero text-foreground">{peakElo}</span>
          </p>
        )}

        <div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            {/* uno de los dos usos del neón en esta pantalla: lo que te falta
                para subir es exactamente lo que se quiere destacar */}
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(resumen.progreso * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {resumen.faltaParaSubir === null ? (
              'Categoría más alta de la escala'
            ) : (
              <>
                <span className="numero text-foreground">{resumen.faltaParaSubir}</span>{' '}
                puntos para subir de categoría
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

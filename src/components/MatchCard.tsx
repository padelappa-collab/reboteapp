import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ETIQUETA_RANKING } from '@/lib/matchType'
import { cn } from '@/lib/utils'
import type { MatchEstado, MatchRow } from '@/types/database'

const ESTILO_ESTADO: Record<MatchEstado, { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-900 border-amber-200' },
  confirmado: { texto: 'Confirmado', clase: '' },
  disputado: { texto: 'En disputa', clase: 'bg-destructive/10 text-destructive border-destructive/20' },
}

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MatchCard({
  partido,
  nombres,
  usuarioId,
}: {
  partido: MatchRow
  /** id -> nombre, para no pintar UUIDs. */
  nombres: Map<string, string>
  usuarioId: string
}) {
  const estado = ESTILO_ESTADO[partido.estado]
  const enParejaA = partido.pareja_a.includes(usuarioId)
  const gane = (enParejaA && partido.ganador === 'a') || (!enParejaA && partido.ganador === 'b')
  const faltan = 4 - partido.resultado_confirmado_por.length

  const nombre = (id: string) => nombres.get(id) ?? '…'

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{fechaCorta(partido.fecha)}</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs">
              {ETIQUETA_RANKING[partido.match_type]}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', estado.clase)}>
              {estado.texto}
            </Badge>
          </div>
        </div>

        <div className="grid gap-1 text-sm">
          <div
            className={cn(
              'flex justify-between gap-2',
              partido.ganador === 'a' && 'font-medium',
            )}
          >
            <span className="truncate">
              {nombre(partido.pareja_a[0])} y {nombre(partido.pareja_a[1])}
            </span>
            <span className="shrink-0 tabular-nums">
              {partido.sets.map((s) => s.a).join(' ')}
            </span>
          </div>
          <div
            className={cn(
              'flex justify-between gap-2',
              partido.ganador === 'b' && 'font-medium',
            )}
          >
            <span className="truncate">
              {nombre(partido.pareja_b[0])} y {nombre(partido.pareja_b[1])}
            </span>
            <span className="shrink-0 tabular-nums">
              {partido.sets.map((s) => s.b).join(' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {partido.estado === 'pendiente'
              ? `Faltan ${faltan} ${faltan === 1 ? 'confirmación' : 'confirmaciones'}`
              : partido.estado === 'confirmado'
                ? gane
                  ? 'Ganaste'
                  : 'Perdiste'
                : 'Hay que corregirlo'}
          </span>
          <Link
            to={`/partidos/${partido.id}`}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver detalle
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

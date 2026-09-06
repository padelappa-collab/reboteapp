import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { BadgeGlyph } from './BadgeGlyph'
import { useBadges, type Insignia } from './useBadges'

/**
 * Un color por familia de insignia.
 *
 * Con todas en neón, treinta casillas idénticas se leían como una textura y
 * ninguna destacaba. El color agrupa: de un vistazo se ve qué es participación y
 * qué es progresión, sin leer los encabezados.
 *
 * Son los mismos tonos de la paleta secundaria de los avatares, así que la app
 * no gana una paleta nueva. Y ninguno es el neón: ese se queda para los botones,
 * que es donde significa "toca aquí".
 */
const COLOR_FAMILIA: Record<string, string> = {
  'Participación': '#3E9B80',
  Racha: '#DE7A52',
  'Progresión': '#C9A03A',
  Social: '#5490B8',
  Especial: '#8B7BC0',
}

function BadgeItem({ insignia }: { insignia: Insignia }) {
  const ganada = insignia.obtenida !== null
  const color = COLOR_FAMILIA[insignia.categoria] ?? '#5490B8'

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[var(--radius)] p-3 text-center',
        // ganada: el dibujo con el color de su familia sobre un tinte del mismo
        // color. Bloqueada: el mismo dibujo en gris, para que se vea qué falta
        // por conseguir en vez de un hueco vacío
        !ganada && 'bg-elevated text-muted-foreground',
      )}
      style={
        ganada ? { color, backgroundColor: `${color}26` } : undefined
      }
      title={
        ganada
          ? `${insignia.descripcion} · ${new Date(insignia.obtenida!).toLocaleDateString('es-CO')}`
          : insignia.descripcion
      }
    >
      <BadgeGlyph id={insignia.id} />
      <span
        className={cn(
          'text-[11px] font-medium leading-tight',
          !ganada && 'text-muted-foreground',
        )}
      >
        {insignia.nombre}
      </span>
    </div>
  )
}

export function BadgeGrid({ userId }: { userId: string | undefined }) {
  const { insignias, cargando } = useBadges(userId)

  if (cargando) return <Skeleton className="h-40 w-full" />
  if (insignias.length === 0) return null

  const ganadas = insignias.filter((i) => i.obtenida !== null).length

  // agrupadas por categoría, en el orden del catálogo
  const grupos = insignias.reduce<Record<string, Insignia[]>>((acc, i) => {
    ;(acc[i.categoria] ??= []).push(i)
    return acc
  }, {})

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Insignias</h2>
          <span className="text-sm text-muted-foreground">
            {ganadas} de {insignias.length}
          </span>
        </div>

        {Object.entries(grupos).map(([categoria, lista]) => (
          <div key={categoria} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{categoria}</p>
            <div className="grid grid-cols-4 gap-2">
              {lista.map((i) => (
                <BadgeItem key={i.id} insignia={i} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

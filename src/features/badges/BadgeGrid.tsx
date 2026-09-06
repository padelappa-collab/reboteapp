import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { BadgeGlyph } from './BadgeGlyph'
import { useBadges, type Insignia } from './useBadges'

function BadgeItem({ insignia }: { insignia: Insignia }) {
  const ganada = insignia.obtenida !== null

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[var(--radius)] p-3 text-center',
        // ganada: el dibujo en neón sobre su propio tinte. Bloqueada: el mismo
        // dibujo en gris, para que se vea qué falta por conseguir en vez de un
        // hueco vacío
        ganada ? 'bg-primary/15 text-primary' : 'bg-elevated text-muted-foreground',
      )}
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

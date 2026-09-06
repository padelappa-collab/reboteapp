import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Lo que se ve cuando todavía no hay nada.
 *
 * Ocupa el alto que le sobra a la pantalla y se centra en él, en vez de dejar
 * un párrafo pegado arriba y medio metro de blanco debajo. Una pantalla con
 * hueco al final se lee como algo a medio hacer; una con su mensaje en el
 * centro se lee como un estado.
 *
 * El icono va en gris. El neón se guarda para el botón, cuando lo hay: si el
 * dibujo grita, la acción deja de destacar y el color pierde el sentido que
 * tiene en el resto de la app.
 */
export function EmptyState({
  icono: Icono,
  titulo,
  texto,
  children,
  className,
}: {
  icono: LucideIcon
  titulo: string
  texto?: string
  /** La acción que saca a la persona de aquí, si la hay. */
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-8 text-center',
        className,
      )}
    >
      <span className="grid size-16 place-items-center rounded-full bg-elevated">
        <Icono className="size-8 text-muted-foreground" strokeWidth={1.5} />
      </span>

      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        {texto && <p className="text-sm text-muted-foreground">{texto}</p>}
      </div>

      {children}
    </div>
  )
}

/**
 * La sugerencia que rellena el hueco cuando hay poco contenido de verdad.
 *
 * No es un estado vacío: hay cosas, pero tan pocas que la pantalla parece
 * cortada. En vez de dejar el aire muerto, se ofrece el siguiente paso.
 */
export function NextStepCard({
  icono: Icono,
  titulo,
  texto,
  children,
}: {
  icono: LucideIcon
  titulo: string
  texto: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-dashed p-4">
      <Icono className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-xs text-muted-foreground">{texto}</p>
        {children}
      </div>
    </div>
  )
}

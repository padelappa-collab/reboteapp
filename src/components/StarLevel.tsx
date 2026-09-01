import { cn } from '@/lib/utils'

/** Sub-nivel dentro de la categoría: 3 tercios, dibujados como estrellas. */
export function StarLevel({
  nivel,
  className,
}: {
  nivel: 1 | 2 | 3
  className?: string
}) {
  return (
    <span
      className={cn('tracking-tight', className)}
      aria-label={`${nivel} de 3 estrellas dentro de la categoría`}
    >
      {'★'.repeat(nivel)}
      <span className="opacity-30">{'☆'.repeat(3 - nivel)}</span>
    </span>
  )
}

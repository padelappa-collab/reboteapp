import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sub-nivel dentro de la categoría: 3 tercios, dibujados como estrellas.
 *
 * Con iconos y no con los caracteres ★ y ☆. Aunque no son emoji, cada sistema
 * los dibuja con su propia fuente: en Android salen más finos, en iOS más
 * redondos, y en ningún caso casan con el grosor de trazo del resto de la
 * interfaz. Es el mismo motivo por el que las insignias llevan glifos propios.
 */
export function StarLevel({
  nivel,
  className,
}: {
  nivel: 1 | 2 | 3
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-px', className)}
      aria-label={`${nivel} de 3 estrellas dentro de la categoría`}
    >
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn('size-3', i <= nivel ? 'fill-current' : 'opacity-30')}
        />
      ))}
    </span>
  )
}

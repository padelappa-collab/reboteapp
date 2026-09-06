import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/**
 * La paleta secundaria de los avatares.
 *
 * Ninguno es el verde neón de marca: si todos fueran variaciones del acento no
 * se distinguirían entre sí, que es justo lo que se quiere evitar. Son tonos
 * apagados que conviven con el fondo cálido sin pelearse con él, y todos llevan
 * texto claro encima porque están calculados para eso.
 */
const COLORES = [
  '#2F6F5E', // verde cancha claro
  '#3B6E8F', // azul apagado
  '#C4623D', // coral quemado
  '#A8802A', // mostaza
  '#6B5B95', // lavanda profunda
  '#4E7A3A', // oliva
  '#9C4F63', // vino suave
  '#2E6E70', // verde azulado
] as const

/**
 * Un color estable por persona.
 *
 * El mismo identificador da siempre el mismo color, en cualquier pantalla y en
 * cualquier sesión: el color acaba funcionando como parte de cómo reconoces a
 * alguien en una lista, y eso solo sirve si no cambia nunca.
 */
export function colorDeAvatar(semilla: string): string {
  let h = 0
  for (let i = 0; i < semilla.length; i++) {
    // djb2: barato y reparte bien para cadenas cortas como un uuid
    h = (h * 33 + semilla.charCodeAt(i)) >>> 0
  }
  return COLORES[h % COLORES.length]
}

export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * El avatar de un jugador, con foto si la tiene y con sus iniciales si no.
 *
 * Existe para que el color salga igual en todas partes. Antes cada pantalla
 * pintaba su propio `Avatar` con el gris de shadcn y la app entera se veía
 * monocroma.
 */
export function UserAvatar({
  id,
  nombre,
  fotoUrl,
  className,
  textoClassName,
}: {
  /** Lo que decide el color. El id es mejor que el nombre: no cambia. */
  id: string
  nombre: string
  fotoUrl?: string | null
  className?: string
  textoClassName?: string
}) {
  return (
    <Avatar className={cn('size-9', className)}>
      {fotoUrl && <AvatarImage src={fotoUrl} alt="" />}
      <AvatarFallback
        className={cn('font-medium text-white', textoClassName)}
        style={{ backgroundColor: colorDeAvatar(id || nombre) }}
      >
        {iniciales(nombre)}
      </AvatarFallback>
    </Avatar>
  )
}

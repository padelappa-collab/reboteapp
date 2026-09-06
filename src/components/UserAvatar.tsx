import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/**
 * La paleta secundaria de los avatares.
 *
 * Ninguno es el verde neón de marca: si todos fueran variaciones del acento no
 * se distinguirían entre sí, que es justo lo que se quiere evitar.
 *
 * Están calculados para el fondo oscuro. Los tonos apagados que funcionaban
 * sobre blanco se hunden en #121212 y todos los avatares acaban pareciendo el
 * mismo círculo gris, que es exactamente el problema que este componente vino a
 * resolver. Estos conservan el matiz y suben en luminosidad.
 */
const COLORES = [
  '#3E9B80', // verde cancha
  '#5490B8', // azul
  '#DE7A52', // coral
  '#C9A03A', // mostaza
  '#8B7BC0', // lavanda
  '#6EA34E', // oliva
  '#C2687E', // vino
  '#3E9497', // verde azulado
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

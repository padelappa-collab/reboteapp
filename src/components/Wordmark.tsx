import { cn } from '@/lib/utils'

/**
 * El logo con el nombre, para las pantallas de fuera de la sesión.
 *
 * Entrar, registrarse y crear el perfil son las únicas pantallas que se ven sin
 * haber entrado nunca, y hasta ahora no decían de qué app son: solo una tarjeta
 * con dos campos. La marca ahí no es adorno, es lo que confirma que estás donde
 * creías estar cuando pones tu correo.
 *
 * Usa el PNG y no el SVG por lo mismo que la cabecera: a este tamaño no se nota
 * la diferencia y el trazado del logo pesa cincuenta veces más.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <img src="/logo-96.png" alt="" width={56} height={56} className="rounded-2xl" />
      <p className="text-lg font-semibold tracking-tight">REBOTEAPP</p>
    </div>
  )
}

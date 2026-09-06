import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Campo de contraseña con el ojo para verla.
 *
 * Escribir a ciegas en el teclado de un teléfono es la causa más común de que
 * alguien no consiga entrar a su propia cuenta: se equivoca en una letra, no lo
 * ve, y acaba culpando a la app. Poder mirar lo que se escribió lo resuelve.
 *
 * Arranca oculta, que es lo que se espera, y el botón queda fuera del orden de
 * tabulación: quien navega con teclado quiere pasar del campo al siguiente, no
 * a un interruptor de visibilidad.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? 'Ocultar la contraseña' : 'Ver la contraseña'}
        className="absolute right-0 top-0 flex h-full w-11 items-center justify-center
                   text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

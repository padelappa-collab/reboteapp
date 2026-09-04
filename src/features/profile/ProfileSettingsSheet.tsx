import { AtSign, Settings } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const FORMATO_USUARIO = /^[a-zA-Z0-9_.]{3,20}$/

export function ProfileSettingsSheet() {
  const { perfil, refrescarPerfil } = useAuth()

  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState(perfil?.nombre ?? '')
  const [usuario, setUsuario] = useState(perfil?.username ?? '')
  const [privada, setPrivada] = useState(perfil?.cuenta_privada ?? false)
  const [enviando, setEnviando] = useState(false)

  if (!perfil) return null

  // ya no puede quedar vacío: sin usuario nadie podría encontrarte
  const usuarioValido = FORMATO_USUARIO.test(usuario)
  const nombreValido = nombre.trim().length >= 2

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombreValido || !usuarioValido) return

    setEnviando(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nombre: nombre.trim(),
          username: usuario.trim(),
          cuenta_privada: privada,
        })
        .eq('id', perfil!.id)

      if (error) {
        // el índice único devuelve un error poco legible
        throw new Error(
          error.code === '23505'
            ? 'Ese nombre de usuario ya está tomado'
            : error.message,
        )
      }

      await refrescarPerfil()
      toast.success('Perfil actualizado')
      setAbierto(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Settings className="size-4" />
          Editar perfil
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar perfil</SheetTitle>
          <SheetDescription>
            Tu género y tu categoría inicial no se pueden cambiar: son la base de tu
            ranking.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={guardar} className="grid gap-5 px-4 pb-6">
          <div className="grid gap-2">
            <Label htmlFor="nombre-perfil">Nombre</Label>
            <Input
              id="nombre-perfil"
              className="h-11"
              maxLength={60}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Como te reconocen en la cancha. Es el que ven los demás jugadores.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="usuario-perfil">Nombre de usuario</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="usuario-perfil"
                className="h-11 pl-9"
                maxLength={20}
                placeholder="sin espacios"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value.trim())}
              />
            </div>
            <p
              className={cn(
                'text-xs',
                usuarioValido ? 'text-muted-foreground' : 'text-destructive',
              )}
            >
              {usuarioValido
                ? 'Único en toda la app y es con lo que te encuentran, así que no puede quedar vacío. Entre 3 y 20 caracteres: letras, números, punto o guion bajo. No tiene que ser tu nombre.'
                : 'Entre 3 y 20 caracteres, solo letras, números, punto o guion bajo.'}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Privacidad de la cuenta</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [false, 'Pública', 'Cualquier jugador ve tus publicaciones'],
                  [true, 'Privada', 'Solo quienes apruebes'],
                ] as const
              ).map(([valor, titulo, ayuda]) => (
                <button
                  key={String(valor)}
                  type="button"
                  onClick={() => setPrivada(valor)}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left',
                    privada === valor
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-accent',
                  )}
                >
                  <span className="block text-sm font-medium">{titulo}</span>
                  <span className="block text-xs text-muted-foreground">{ayuda}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              La privacidad solo afecta al feed. Tu ranking, tu categoría y tus partidos
              son públicos siempre.
            </p>
          </div>

          <Button
            type="submit"
            className="h-11 w-full"
            disabled={enviando || !nombreValido || !usuarioValido}
          >
            {enviando ? 'Guardando…' : 'Guardar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

import { Link, Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/useAuth'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Marco de la app: cabecera con acceso al perfil, contenido y navegación. */
export function AppShell() {
  const { perfil } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link to="/social" className="font-semibold tracking-tight">
            REBOTEAPP
          </Link>

          {perfil && (
            <Link to="/perfil" aria-label="Tu perfil">
              <Avatar className="size-9">
                {perfil.foto_url && <AvatarImage src={perfil.foto_url} alt="" />}
                <AvatarFallback className="text-xs">
                  {iniciales(perfil.nombre)}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 p-4">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  )
}

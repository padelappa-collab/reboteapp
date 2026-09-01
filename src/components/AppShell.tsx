import { LogOut } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'

/** Marco de la app: cabecera fija, contenido y navegación inferior. */
export function AppShell() {
  const { perfil, cerrarSesion } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <span className="font-semibold tracking-tight">REBOTEAPP</span>
          {perfil && (
            <Button
              variant="ghost"
              size="icon"
              onClick={cerrarSesion}
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </Button>
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

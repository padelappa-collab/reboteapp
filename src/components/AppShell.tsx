import { LogOut } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'

/**
 * Marco de la app. La barra inferior de navegación entra cuando existan más
 * pantallas (partidos, ranking, tablón); por ahora solo hay perfil.
 */
export function AppShell() {
  const { perfil, cerrarSesion } = useAuth()

  return (
    <div className="min-h-dvh bg-background">
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

      <div className="mx-auto max-w-md p-4">
        <Outlet />
      </div>
    </div>
  )
}

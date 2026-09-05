import { Bell } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { InstallBanner } from '@/features/install/InstallBanner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { sinLeer } from '@/features/notifications/notifications.api'

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
  const ubicacion = useLocation()
  const [pendientes, setPendientes] = useState(0)

  // se recuenta al cambiar de pantalla: sin realtime, es el momento natural
  const contar = useCallback(async () => {
    if (!perfil) return
    try {
      setPendientes(await sinLeer(perfil.id))
    } catch {
      /* si falla, la campanita simplemente no muestra número */
    }
  }, [perfil])

  useEffect(() => {
    contar()
  }, [contar, ubicacion.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link to="/social" className="flex items-center gap-2">
            {/* el PNG y no el SVG: el trazado del logo pesa 54 KB comprimido y
                aqui se ve a 28 px, donde no se nota. Los dos salen del mismo
                maestro, asi que no pueden descuadrarse */}
            <img
              src="/logo-96.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
            <span className="font-semibold tracking-tight">REBOTEAPP</span>
          </Link>

          {perfil && (
            <div className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={
                  pendientes > 0 ? `Novedades, ${pendientes} sin leer` : 'Novedades'
                }
              >
                <Link to="/novedades">
                  <Bell className="size-5" />
                  {pendientes > 0 && (
                    <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 text-destructive-foreground">
                      {pendientes > 9 ? '9+' : pendientes}
                    </span>
                  )}
                </Link>
              </Button>

              <Link to="/perfil" aria-label="Tu perfil">
                <Avatar className="size-9">
                  {perfil.foto_url && <AvatarImage src={perfil.foto_url} alt="" />}
                  <AvatarFallback className="text-xs">
                    {iniciales(perfil.nombre)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 p-4">
        <Outlet />
      </div>

      <InstallBanner />
      <BottomNav />
    </div>
  )
}

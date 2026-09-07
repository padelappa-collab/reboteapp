import { Bell } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { InstallBanner } from '@/features/install/InstallBanner'
import { WelcomeSheet } from '@/features/notifications/WelcomeSheet'
import { WelcomeTour, tourPendiente } from '@/features/onboarding/WelcomeTour'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { sinLeer } from '@/features/notifications/notifications.api'
import { colorDeAvatar } from '@/components/UserAvatar'

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
  const [tour, setTour] = useState(false)

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


  // El recorrido sale una vez, en cuanto hay perfil. Va antes que el
  // ofrecimiento de avisos para no apilar dos hojas encima de la otra.
  useEffect(() => {
    if (perfil && tourPendiente()) setTour(true)
  }, [perfil])
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/*
        La cabecera reserva el hueco de la barra de estado.
 
        Instalada en la pantalla de inicio, la app ocupa la pantalla entera y el
        reloj y la batería del iPhone se dibujan ENCIMA del contenido. Sin este
        relleno, el logo y la campana quedaban debajo del notch: se veían
        cortados y no había forma de tocarlos.
 
        `env(safe-area-inset-top)` vale cero en el navegador y en Android, así
        que no sobra espacio donde no hace falta.
      */}
      <header
        className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
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
                  <AvatarFallback
                    className="text-xs font-medium text-white"
                    style={{ backgroundColor: colorDeAvatar(perfil.id) }}
                  >
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

      <WelcomeTour abierto={tour} onCerrar={() => setTour(false)} />

      {/*
        Mientras el recorrido esté abierto, el ofrecimiento de avisos ni se
        monta: dos hojas apiladas se tapan, y la de abajo se queda esperando a
        que alguien la vea. Al cerrarse el recorrido, esto monta de nuevo y su
        efecto decide si toca preguntar.
      */}
      {!tour && <WelcomeSheet />}
      <InstallBanner />
      <BottomNav />
    </div>
  )
}

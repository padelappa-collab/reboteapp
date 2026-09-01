import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  )
}

/**
 * Tres estados, no dos: sin sesión, con sesión pero sin perfil (falta el
 * onboarding, típico de quien entra con Google), y listo.
 */
export function ProtectedRoute() {
  const { session, perfil, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) return <Cargando />
  if (!session) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />
  if (!perfil) return <Navigate to="/perfil/nuevo" replace />

  return <Outlet />
}

/** Para /entrar y /registro: si ya hay sesión, no tiene sentido mostrarlas. */
export function GuestRoute() {
  const { session, perfil, cargando } = useAuth()

  if (cargando) return <Cargando />
  if (session) return <Navigate to={perfil ? '/' : '/perfil/nuevo'} replace />

  return <Outlet />
}

/** El onboarding necesita sesión, pero justamente NO tener perfil todavía. */
export function OnboardingRoute() {
  const { session, perfil, cargando } = useAuth()

  if (cargando) return <Cargando />
  if (!session) return <Navigate to="/entrar" replace />
  if (perfil) return <Navigate to="/" replace />

  return <Outlet />
}

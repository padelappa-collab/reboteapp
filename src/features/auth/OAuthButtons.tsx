import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { APPLE_SIGN_IN_HABILITADO } from '@/lib/flags'
import { entrarConProveedor, type Proveedor } from './auth.api'

function IconoGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.46Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.540-2.03-6.45-4.75H1.71v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.17a6.9 6.9 0 0 1 0-4.34V6.85H1.71a11.5 11.5 0 0 0 0 10.3l3.84-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.9c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.44 15.1.5 12 .5A11.5 11.5 0 0 0 1.71 6.85l3.84 2.98C6.46 7.11 9 4.9 12 4.9Z"
      />
    </svg>
  )
}

function IconoApple() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.72c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.79-3.34-1.81-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.28-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.6-.75 3-.75s1.79.75 3.01.72c1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.45-3.69ZM14.1 5.2c.64-.78 1.07-1.86.95-2.94-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.85 1.03.08 2.07-.52 2.71-1.29Z" />
    </svg>
  )
}

/**
 * Entrada con proveedores externos.
 *
 * Google está activo. Apple queda detrás de bandera hasta que exista la cuenta
 * de Apple Developer y el proveedor configurado en Supabase.
 */
export function OAuthButtons({ deshabilitado }: { deshabilitado?: boolean }) {
  const [cargando, setCargando] = useState<Proveedor | null>(null)

  async function entrar(proveedor: Proveedor) {
    setCargando(proveedor)
    try {
      await entrarConProveedor(proveedor)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar sesión')
      setCargando(null)
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={deshabilitado || cargando !== null}
        onClick={() => entrar('google')}
      >
        <IconoGoogle />
        Continuar con Google
      </Button>

      {APPLE_SIGN_IN_HABILITADO && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={deshabilitado || cargando !== null}
          onClick={() => entrar('apple')}
        >
          <IconoApple />
          Continuar con Apple
        </Button>
      )}
    </div>
  )
}

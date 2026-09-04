import { Check, Lock, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { aceptarSeguidor, rechazarSeguidor, solicitudesPendientes } from './feed.api'

/** Privacidad de la cuenta y solicitudes de seguimiento por responder. */
export function PrivacidadCard() {
  const { perfil, refrescarPerfil } = useAuth()
  const [solicitudes, setSolicitudes] = useState<
    Array<{ follower_id: string; solicitante: { id: string; nombre: string } | null }>
  >([])
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!perfil) return
    try {
      setSolicitudes(await solicitudesPendientes(perfil.id))
    } catch (error) {
      console.error('No se pudieron cargar las solicitudes', error)
    }
  }, [perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!perfil) return null

  async function alternarPrivacidad() {
    setEnviando(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ cuenta_privada: !perfil!.cuenta_privada })
        .eq('id', perfil!.id)

      if (error) throw new Error(error.message)
      await refrescarPerfil()
      toast.success(
        perfil!.cuenta_privada ? 'Tu cuenta ahora es pública' : 'Tu cuenta ahora es privada',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar')
    } finally {
      setEnviando(false)
    }
  }

  async function responder(seguidorId: string, aceptar: boolean) {
    setEnviando(true)
    try {
      if (aceptar) {
        await aceptarSeguidor(seguidorId, perfil!.id)
      } else {
        await rechazarSeguidor(seguidorId, perfil!.id)
      }
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo responder')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium">
              <Lock className="size-4" />
              Cuenta {perfil.cuenta_privada ? 'privada' : 'pública'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {perfil.cuenta_privada
                ? 'Solo quienes apruebes ven tus publicaciones.'
                : 'Cualquier jugador ve tus publicaciones.'}{' '}
              Tu ranking, tu categoría y tus partidos son públicos siempre.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            disabled={enviando}
            onClick={alternarPrivacidad}
          >
            {perfil.cuenta_privada ? 'Hacer pública' : 'Hacer privada'}
          </Button>
        </div>

        {solicitudes.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">
              Solicitudes para seguirte ({solicitudes.length})
            </p>
            {solicitudes.map((s) => (
              <div key={s.follower_id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {s.solicitante?.nombre ?? '…'}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-9"
                  aria-label="Aceptar"
                  disabled={enviando}
                  onClick={() => responder(s.follower_id, true)}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  aria-label="Rechazar"
                  disabled={enviando}
                  onClick={() => responder(s.follower_id, false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

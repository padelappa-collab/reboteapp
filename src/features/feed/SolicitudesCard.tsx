import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/useAuth'
import { aceptarSeguidor, rechazarSeguidor, solicitudesPendientes } from './feed.api'

/** Solicitudes de seguimiento por responder. Solo aparece si hay alguna. */
export function SolicitudesCard() {
  const { perfil } = useAuth()
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

  if (!perfil || solicitudes.length === 0) return null

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
      <CardContent className="space-y-2">
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
      </CardContent>
    </Card>
  )
}

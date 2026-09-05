import { Bell, BellOff, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/useAuth'
import {
  activarPush,
  desactivarPush,
  esIOS,
  estaInstalada,
  estaSuscrito,
  soportaPush,
} from '@/lib/push'

/** Interruptor de las notificaciones al teléfono. */
export function PushCard() {
  const { perfil, refrescarPerfil } = useAuth()
  const [suscrito, setSuscrito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    estaSuscrito().then(setSuscrito)
  }, [])

  if (!perfil) return null

  // en iPhone sin instalar, el navegador ni siquiera ofrece la posibilidad
  const faltaInstalar = esIOS() && !estaInstalada()

  if (!soportaPush() && !faltaInstalar) return null

  async function activar() {
    setEnviando(true)
    try {
      const fallo = await activarPush(perfil!.id)
      if (fallo) {
        toast.error(fallo, { duration: 6000 })
      } else {
        setSuscrito(true)
        await refrescarPerfil()
        toast.success('Listo, te avisaremos al teléfono')
      }
    } finally {
      setEnviando(false)
    }
  }

  async function desactivar() {
    setEnviando(true)
    try {
      await desactivarPush(perfil!.id)
      setSuscrito(false)
      await refrescarPerfil()
      toast.info('Ya no recibirás notificaciones en este dispositivo')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          {suscrito ? (
            <Bell className="mt-0.5 size-5 shrink-0 text-court" />
          ) : (
            <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="font-medium">Notificaciones en el teléfono</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {suscrito
                ? 'Te avisamos aunque tengas la app cerrada: cuando te agreguen a un partido, cuando falte tu confirmación y cuando se mueva tu ELO.'
                : 'Sin esto solo ves los avisos al abrir la app. El más importante es cuando te piden confirmar un partido: hasta que los cuatro confirmen, el ELO no se mueve.'}
            </p>
          </div>
        </div>

        {faltaInstalar ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <Smartphone className="mt-0.5 size-4 shrink-0" />
            <span>
              En iPhone las notificaciones solo funcionan con la app instalada. Ábrela
              en Safari, toca el botón de compartir y elige{' '}
              <span className="font-medium">Añadir a pantalla de inicio</span>.
            </span>
          </div>
        ) : suscrito ? (
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={enviando}
            onClick={desactivar}
          >
            Desactivar en este dispositivo
          </Button>
        ) : (
          <Button className="h-11 w-full" disabled={enviando} onClick={activar}>
            <Bell className="size-4" />
            Activar notificaciones
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

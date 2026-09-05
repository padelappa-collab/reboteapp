import { Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { plataforma } from '@/lib/instalar'
import { InstallSheet } from './InstallSheet'

/**
 * La entrada fija para instalar, en el perfil.
 *
 * La franja de abajo se cierra y no vuelve; esto es para quien la cerró sin
 * leerla y después quiso instalarla. Desaparece sola una vez instalada.
 */
export function InstallCard() {
  const donde = plataforma()
  if (donde === 'instalada' || donde === 'escritorio') return null

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-court" />
          <div className="min-w-0">
            <p className="font-medium">Instalar en la pantalla de inicio</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {donde === 'android'
                ? 'Se abre como cualquier otra app y entra más rápido. No es una descarga: no ocupa casi nada.'
                : 'En iPhone es lo que permite que te lleguen los avisos: Apple no deja que una página del navegador te notifique.'}
            </p>
          </div>
        </div>

        <InstallSheet>
          <Button variant="outline" className="h-11 w-full">
            <Download className="size-4" />
            Ver cómo se hace
          </Button>
        </InstallSheet>
      </CardContent>
    </Card>
  )
}

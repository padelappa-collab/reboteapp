import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { descartar, plataforma, seDescarto, suscribirse } from '@/lib/instalar'
import { InstallSheet } from './InstallSheet'

/**
 * Franja que ofrece instalar la app.
 *
 * Aparece una vez, se cierra y no vuelve. Quien la cierre y luego cambie de
 * idea la encuentra siempre en su perfil.
 *
 * Solo en teléfono y solo si no está instalada ya. En escritorio no sale: no
 * hay nada que ganar y estorbaría a quien esté probando desde el computador.
 */
export function InstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function revisar() {
      const donde = plataforma()
      const enTelefono =
        donde === 'android' || donde === 'ios-safari' || donde === 'ios-navegador'
      setVisible(enTelefono && !seDescarto())
    }
    revisar()
    // en Android el evento puede llegar después de montar
    return suscribirse(revisar)
  }, [])

  if (!visible) return null

  function cerrar() {
    descartar()
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-2">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-xl border bg-card p-3 shadow-lg">
        <Download className="size-5 shrink-0 text-court" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Ten REBOTEAPP a mano</p>
          <p className="text-xs text-muted-foreground">
            Instálala en tu pantalla de inicio y recibe los avisos de tus partidos.
          </p>
        </div>

        <InstallSheet>
          <Button size="sm" className="h-9 shrink-0">
            Cómo
          </Button>
        </InstallSheet>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Ahora no"
          className="size-8 shrink-0"
          onClick={cerrar}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}

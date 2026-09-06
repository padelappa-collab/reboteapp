import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/useAuth'
import { activarPush, esIOS, estaInstalada, estaSuscrito, soportaPush } from '@/lib/push'

/** Que ya se preguntó en ESTE navegador o en ESTA instalación. */
const CLAVE = 'reboteapp-avisos-preguntado'

/**
 * El ofrecimiento de encender los avisos.
 *
 * Antes salía solo al crear la cuenta, y eso dejaba fuera el caso que más
 * importa: alguien que ya tenía cuenta y acaba de instalar la app en su
 * teléfono. En iPhone ese es justo el momento en que los avisos pasan a ser
 * posibles —antes de instalar, Apple no los permite— y no había nada que se lo
 * dijera. Desinstalar además borra el almacenamiento, así que la marca de "ya
 * preguntamos" desaparecía y aun así no volvía a preguntar.
 *
 * Ahora la condición es la que de verdad importa: si aquí se puede pedir el
 * permiso y todavía no está dado, se pregunta. Una vez por instalación, porque
 * en iPhone un "no" es casi definitivo —hay que ir a los ajustes del sistema
 * para revertirlo— y no se gana nada insistiendo.
 *
 * El permiso lo pide el botón, nunca la app sola: si se pide sin que nadie lo
 * toque, el navegador lo ignora o la persona dice que no por reflejo.
 */
export function WelcomeSheet() {
  const { perfil } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [activando, setActivando] = useState(false)

  useEffect(() => {
    if (!perfil) return
    if (localStorage.getItem(CLAVE) === '1') return
    if (!soportaPush()) return
    // en iPhone sin instalar no hay permiso que pedir, y de eso ya avisa la
    // franja de instalación, que sale en cada visita
    if (esIOS() && !estaInstalada()) return

    let vigente = true
    estaSuscrito().then((si) => {
      if (vigente && !si) setAbierto(true)
    })
    return () => {
      vigente = false
    }
  }, [perfil])

  /** Se pregunta una sola vez, se conteste lo que se conteste. */
  function cerrar() {
    localStorage.setItem(CLAVE, '1')
    setAbierto(false)
  }

  if (!perfil) return null

  return (
    <Sheet open={abierto} onOpenChange={(o) => (o ? setAbierto(true) : cerrar())}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-5 text-court" />
            ¿Te avisamos al teléfono?
          </SheetTitle>
          <SheetDescription>
            El aviso que más importa es cuando te piden confirmar un partido:
            hasta que los cuatro confirmen, el ELO no se mueve. También te
            avisamos cuando te agreguen a un partido, te sigan o te escriban.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-6">
          <Button
            className="h-11 w-full"
            disabled={activando}
            onClick={async () => {
              setActivando(true)
              try {
                const fallo = await activarPush(perfil!.id)
                if (fallo) {
                  toast.error(fallo, { duration: 6000 })
                } else {
                  toast.success('Listo, te avisaremos al teléfono')
                  cerrar()
                }
              } finally {
                setActivando(false)
              }
            }}
          >
            <Bell className="size-4" />
            {activando ? 'Activando…' : 'Sí, avísenme'}
          </Button>

          <Button variant="ghost" className="h-11 w-full" onClick={cerrar}>
            Ahora no
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Puedes cambiarlo cuando quieras desde tu perfil.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

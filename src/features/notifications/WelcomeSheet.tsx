import { Bell, Smartphone } from 'lucide-react'
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
import { InstallSheet } from '@/features/install/InstallSheet'
import { activarPush, esIOS, estaInstalada, soportaPush } from '@/lib/push'

/** La marca que deja el registro para que esto salga una sola vez. */
const CLAVE = 'reboteapp-bienvenida'

export function marcarRecienCreado() {
  localStorage.setItem(CLAVE, '1')
}

/**
 * El ofrecimiento de notificaciones al entrar por primera vez.
 *
 * Se pide aquí y no al abrir cualquier día porque el primer minuto es cuando la
 * persona entiende para qué sirve: acaba de crear su cuenta y todavía no ha
 * registrado nada. Y en iPhone un "no" al permiso es casi definitivo —hay que ir
 * a los ajustes del sistema para revertirlo—, así que solo se pregunta una vez y
 * en el momento en que la respuesta tiene sentido.
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
    if (localStorage.getItem(CLAVE) !== '1') return
    // ya no hace falta guardarla: se pregunta una vez y se acabó
    localStorage.removeItem(CLAVE)
    setAbierto(true)
  }, [perfil])

  if (!perfil) return null

  // en iPhone sin instalar no hay permiso que pedir: primero hay que instalarla
  const faltaInstalar = esIOS() && !estaInstalada()

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
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
          {faltaInstalar ? (
            <>
              <div className="flex items-start gap-2 rounded-[var(--radius)] bg-elevated p-3 text-xs text-muted-foreground">
                <Smartphone className="mt-0.5 size-4 shrink-0" />
                <span>
                  En iPhone hace falta instalar REBOTEAPP en la pantalla de
                  inicio: Apple no deja que una página del navegador te notifique.
                </span>
              </div>

              <InstallSheet>
                <Button className="h-11 w-full">Ver cómo se instala</Button>
              </InstallSheet>
            </>
          ) : (
            <Button
              className="h-11 w-full"
              disabled={activando || !soportaPush()}
              onClick={async () => {
                setActivando(true)
                try {
                  const fallo = await activarPush(perfil!.id)
                  if (fallo) {
                    toast.error(fallo, { duration: 6000 })
                  } else {
                    toast.success('Listo, te avisaremos al teléfono')
                    setAbierto(false)
                  }
                } finally {
                  setActivando(false)
                }
              }}
            >
              <Bell className="size-4" />
              {activando ? 'Activando…' : 'Sí, avísenme'}
            </Button>
          )}

          <Button
            variant="ghost"
            className="h-11 w-full"
            onClick={() => setAbierto(false)}
          >
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

import { Check, Copy, Download, Share } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  descartar,
  hayInstalacionNativa,
  instalar,
  plataforma,
  type Plataforma,
} from '@/lib/instalar'

/**
 * La barra de abajo de Safari, con el botón de compartir señalado.
 *
 * Dibujada y no fotografiada a propósito: lo que la gente busca en la pantalla
 * es la FORMA del icono, no una foto de un iPhone. Así se ve nítido en
 * cualquier pantalla, pesa unos pocos kilobytes, funciona igual en claro y en
 * oscuro, y no envejece cuando Apple cambia el color de una barra.
 */
function BarraSafari() {
  return (
    <svg
      viewBox="0 0 240 64"
      className="w-full"
      role="img"
      aria-label="Barra inferior de Safari con el botón de compartir señalado"
    >
      <rect
        x="1"
        y="1"
        width="238"
        height="62"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />

      <g
        className="stroke-muted-foreground"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M36 26l-7 6 7 6" />
        <path d="M74 26l7 6-7 6" />
        <rect x="158" y="24" width="16" height="16" rx="2" />
        <rect x="198" y="24" width="13" height="13" rx="2" />
        <rect x="203" y="29" width="13" height="13" rx="2" />
      </g>

      {/* el de compartir, resaltado: es el único que importa */}
      <circle cx="120" cy="32" r="19" className="fill-primary/15 stroke-primary" strokeWidth="2" />
      <g
        className="stroke-primary"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M114 31h-2a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2" />
        <path d="M120 35V23" />
        <path d="m116 27 4-4 4 4" />
      </g>
    </svg>
  )
}

/** La opción del menú que hay que buscar, con su icono y su texto. */
function OpcionAnadir() {
  return (
    <svg
      viewBox="0 0 240 64"
      className="w-full"
      role="img"
      aria-label="Opción Añadir a pantalla de inicio dentro del menú de compartir"
    >
      <rect
        x="1"
        y="1"
        width="238"
        height="62"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />

      <rect x="9" y="9" width="222" height="20" rx="6" className="fill-border/60" />

      <rect x="9" y="35" width="222" height="22" rx="6" className="fill-primary/15" />
      <text
        x="20"
        y="50"
        className="fill-primary"
        style={{ fontSize: '11px', fontWeight: 600 }}
      >
        Añadir a pantalla de inicio
      </text>
      <g
        className="stroke-primary"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      >
        <rect x="205" y="38" width="16" height="16" rx="4" />
        <path d="M213 42v8M209 46h8" />
      </g>
    </svg>
  )
}

function Paso({
  numero,
  titulo,
  children,
}: {
  numero: number
  titulo: string
  children?: ReactNode
}) {
  return (
    <li className="space-y-2">
      <p className="flex items-start gap-2 text-sm">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {numero}
        </span>
        <span className="font-medium">{titulo}</span>
      </p>
      {children && <div className="pl-7">{children}</div>}
    </li>
  )
}

function Contenido({ donde }: { donde: Plataforma }) {
  const [copiado, setCopiado] = useState(false)
  const [instalando, setInstalando] = useState(false)

  if (donde === 'android') {
    return (
      <div className="space-y-4 px-4 pb-6">
        <p className="text-sm text-muted-foreground">
          En Android se instala de un toque. No ocupa casi nada: no es una
          descarga, es la misma app anclada en tu pantalla de inicio.
        </p>

        {hayInstalacionNativa() ? (
          <Button
            className="h-11 w-full"
            disabled={instalando}
            onClick={async () => {
              setInstalando(true)
              try {
                const acepto = await instalar()
                if (acepto) toast.success('Listo, ya la tienes en tu pantalla de inicio')
              } finally {
                setInstalando(false)
              }
            }}
          >
            <Download className="size-4" />
            Instalar REBOTEAPP
          </Button>
        ) : (
          <ol className="space-y-3">
            <Paso numero={1} titulo="Abre el menú de Chrome (los tres puntos, arriba a la derecha)" />
            <Paso numero={2} titulo="Elige “Instalar aplicación” o “Añadir a pantalla de inicio”" />
          </ol>
        )}
      </div>
    )
  }

  if (donde === 'ios-navegador') {
    return (
      <div className="space-y-4 px-4 pb-6">
        <p className="text-sm text-muted-foreground">
          Estás viendo REBOTEAPP dentro de otra app. Desde aquí iPhone no deja
          instalarla: hay que abrirla en Safari primero.
        </p>

        <ol className="space-y-3">
          <Paso numero={1} titulo="Toca los tres puntos y elige “Abrir en Safari”" />
          <Paso numero={2} titulo="Ya en Safari, vuelve a este mismo aviso y sigue los pasos" />
        </ol>

        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.origin)
              setCopiado(true)
              toast.success('Enlace copiado. Pégalo en Safari.')
            } catch {
              toast.error('No se pudo copiar. Anota la dirección: reboteapp.online')
            }
          }}
        >
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copiar el enlace
        </Button>
      </div>
    )
  }

  if (donde === 'ios-safari') {
    return (
      <div className="space-y-4 px-4 pb-6">
        <p className="text-sm text-muted-foreground">
          En iPhone hay que instalarla para recibir avisos: Apple no deja que una
          página del navegador te notifique. Son dos toques.
        </p>

        <ol className="space-y-4">
          <Paso numero={1} titulo="Toca el botón de compartir, abajo en el centro">
            <BarraSafari />
          </Paso>

          <Paso numero={2} titulo="Baja en el menú y elige “Añadir a pantalla de inicio”">
            <OpcionAnadir />
          </Paso>

          <Paso numero={3} titulo="Confirma con “Añadir”, arriba a la derecha" />
        </ol>

        <p className="text-xs text-muted-foreground">
          Después ábrela desde el icono nuevo, no desde Safari: es esa versión la
          que recibe las notificaciones.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-4 pb-6">
      <p className="text-sm text-muted-foreground">
        REBOTEAPP está pensada para el teléfono. Ábrela en tu móvil —desde Safari
        si es un iPhone, desde Chrome si es Android— y ahí podrás instalarla en la
        pantalla de inicio.
      </p>
    </div>
  )
}

/**
 * Las instrucciones para instalar, adaptadas al teléfono de quien mira.
 *
 * Se envuelve alrededor de lo que sea que la abra, para poder usarla igual
 * desde la franja de abajo que desde el perfil.
 */
export function InstallSheet({
  children,
  onCerrar,
}: {
  children: ReactNode
  onCerrar?: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const donde = plataforma()

  return (
    <Sheet
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (!o) onCerrar?.()
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Share className="size-5 text-primary" />
            Instala REBOTEAPP
          </SheetTitle>
          <SheetDescription>
            Se abre como cualquier otra app, entra más rápido y te llegan los
            avisos aunque la tengas cerrada.
          </SheetDescription>
        </SheetHeader>

        <Contenido donde={donde} />
      </SheetContent>
    </Sheet>
  )
}

/** El mismo panel, pero recordando que ya no hay que insistir. */
export function marcarVisto() {
  descartar()
}

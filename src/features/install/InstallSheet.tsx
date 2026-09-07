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
/**
 * La barra de Safari tal como sale de fábrica, con los tres puntos señalados.
 *
 * Desde iOS 26 el diseño por defecto es el "Compacto": una sola píldora abajo
 * con el atrás, la dirección y un botón de tres puntos a la derecha. El de
 * compartir dejó de estar a la vista y vive dentro de ese menú. Por eso las
 * instrucciones de toda la vida --"toca compartir, abajo en el centro"-- ya no
 * corresponden con lo que la mayoría ve, y quien las seguía no encontraba nada.
 *
 * Se dibuja y no se fotografía porque lo que se busca en la pantalla es la
 * FORMA del botón, no una foto de un iPhone: así se ve nítido en cualquier
 * pantalla, pesa unos kilobytes y no envejece cuando Apple cambia un color.
 */
function BarraCompacta() {
  return (
    <svg
      viewBox="0 0 240 56"
      className="w-full"
      role="img"
      aria-label="Barra de Safari con el botón de tres puntos señalado, a la derecha"
    >
      <rect
        x="1"
        y="1"
        width="238"
        height="54"
        rx="14"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />

      <rect x="12" y="13" width="216" height="30" rx="15" className="fill-background" />

      <g
        className="stroke-muted-foreground"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M31 24l-5 4 5 4" />
      </g>

      <text x="46" y="32" className="fill-muted-foreground" style={{ fontSize: '11px' }}>
        reboteapp.online
      </text>

      {/* los tres puntos, resaltados: es lo único que hay que tocar */}
      <circle
        cx="207"
        cy="28"
        r="15"
        className="fill-primary/15 stroke-primary"
        strokeWidth="2"
      />
      <g className="fill-primary">
        <circle cx="201" cy="28" r="1.9" />
        <circle cx="207" cy="28" r="1.9" />
        <circle cx="213" cy="28" r="1.9" />
      </g>
    </svg>
  )
}

/** El icono de compartir, para reconocerlo si sale directo. */
function IconoCompartir() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline-block size-5 align-text-bottom"
      role="img"
      aria-label="Botón de compartir"
    >
      <g
        className="stroke-primary"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
        <path d="M12 14V3" />
        <path d="m8.5 6.5 3.5-3.5 3.5 3.5" />
      </g>
    </svg>
  )
}

/**
 * La flecha que despliega el resto del menú de compartir.
 *
 * El menú sale con unas pocas opciones y una flecha hacia abajo que enseña las
 * demás. "Añadir a pantalla de inicio" está entre las escondidas, así que quien
 * no toca esa flecha recorre la lista corta, no la ve, y concluye que su
 * teléfono no puede instalar la app.
 */
function FlechaVerMas() {
  return (
    <svg
      viewBox="0 0 240 64"
      className="w-full"
      role="img"
      aria-label="Menú de compartir con la flecha hacia abajo señalada"
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

      {/* dos opciones a la vista, y el resto debajo */}
      <rect x="10" y="10" width="180" height="16" rx="5" className="fill-border/60" />
      <rect x="10" y="32" width="150" height="16" rx="5" className="fill-border/60" />

      {/* la flecha, resaltada */}
      <circle
        cx="211"
        cy="20"
        r="14"
        className="fill-primary/15 stroke-primary"
        strokeWidth="2"
      />
      <g
        className="stroke-primary"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m205 17 6 6 6-6" />
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
            <Paso
              numero={2}
              titulo="Elige “Instalar aplicación” o “Añadir a pantalla de inicio”"
            >
              {/*
                El menú de Chrome en Android reparte las opciones entre las que se
                ven y las que quedan detrás de “Ver más”, y cuál cae dónde depende
                del teléfono. Quien no la encuentra a la primera concluye que su
                móvil no puede, y se queda sin avisos.
              */}
              <p className="text-xs text-muted-foreground">
                Si no la ves en la lista, baja del todo y toca “Ver más”: en muchos
                teléfonos está ahí dentro.
              </p>
            </Paso>
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
          página del navegador te notifique. Son cinco toques, pero se hace una sola vez.
        </p>

        <ol className="space-y-4">
          <Paso numero={1} titulo="Toca los tres puntos, abajo a la derecha">
            <BarraCompacta />
            {/*
              Desde iOS 26 el diseño de fábrica esconde el compartir detrás de
              este menú, y ese es el que tiene la mayoría. Pero quien siga en
              iOS 18, o haya elegido otro diseño en Ajustes, ve el compartir
              directo: se nombran los dos para que nadie se quede parado.
            */}
            <p className="mt-1 text-xs text-muted-foreground">
              Si en vez de los tres puntos ves el botón de compartir{' '}
              <IconoCompartir />, tócalo y salta al paso 3.
            </p>
          </Paso>

          <Paso numero={2} titulo="En el menú que se abre, elige “Compartir”" />

          <Paso numero={3} titulo="Toca la flecha hacia abajo para ver el resto">
            <FlechaVerMas />
            <p className="mt-1 text-xs text-muted-foreground">
              El menú se abre con solo unas pocas opciones. Esa flecha enseña las
              demás, y “Añadir a pantalla de inicio” es una de las escondidas.
            </p>
          </Paso>

          <Paso numero={4} titulo="Elige “Añadir a pantalla de inicio”">
            <OpcionAnadir />
          </Paso>

          <Paso numero={5} titulo="Confirma con “Añadir”, arriba a la derecha" />
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
            <Share className="size-5 text-court" />
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

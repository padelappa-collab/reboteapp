import {
  ClipboardList,
  MapPin,
  MessagesSquare,
  Megaphone,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/** Que este navegador ya vio el recorrido. */
const CLAVE = 'reboteapp-tour-visto'

export function tourPendiente(): boolean {
  return localStorage.getItem(CLAVE) !== '1'
}

export function marcarTourVisto() {
  localStorage.setItem(CLAVE, '1')
}

type Pantalla = {
  icono: LucideIcon
  titulo: string
  texto: string
}

/**
 * Cinco pantallas, una por sección.
 *
 * El texto es corto a propósito: nadie lee un tutorial, lo pasa. Lo que tiene
 * que quedar de cada pantalla es una sola idea, y en tres de ellas esa idea es
 * justo la que genera dudas cuando falta —que un partido no cuenta hasta que
 * lo confirman los cuatro, que hay tres rankings separados, y que las canchas
 * no se reservan desde aquí—.
 */
const PANTALLAS: Pantalla[] = [
  {
    icono: ClipboardList,
    titulo: 'Partidos',
    texto:
      'Registra el resultado y elige a los cuatro que jugaron. El partido no cuenta para el ranking hasta que los cuatro lo confirman, así que avísales si tardan.',
  },
  {
    icono: TrendingUp,
    titulo: 'Ranking',
    texto:
      'Hay tres rankings separados: masculino, femenino y mixto. Cada partido mueve el que le toca según quién jugó. Tu categoría sale de tus puntos, y las estrellas dicen cuánto te falta para la siguiente.',
  },
  {
    icono: Megaphone,
    titulo: 'Tablón',
    texto:
      'Te falta un cuarto para completar. Publica el día, la cancha y el nivel que buscas, y quien quiera se apunta. O mira lo que publicaron los demás y apúntate tú.',
  },
  {
    icono: MessagesSquare,
    titulo: 'Social',
    texto:
      'Sube fotos de tus partidos al feed, cuenta el día en una historia —dura 24 horas— y escríbele por privado a quien sigas o tenga la cuenta abierta.',
  },
  {
    icono: MapPin,
    titulo: 'Canchas',
    texto:
      'El mapa te dice dónde están las canchas de Cartagena y cómo contactarlas. La reserva se hace directo con cada club: aquí no se aparta cancha.',
  },
]

/**
 * El recorrido de bienvenida.
 *
 * Sale una vez, al terminar de crear el perfil, y se puede volver a ver desde el
 * perfil. Se puede saltar en cualquier momento: obligarlo solo consigue que la
 * gente toque "siguiente" cinco veces sin leer.
 *
 * La marca de visto vive en este navegador y no en la base. Es información de
 * conveniencia, no del jugador, y guardarla en `users` obligaría a abrir una
 * columna más a la escritura del cliente. Lo peor que pasa si alguien entra
 * desde otro teléfono es que lo vea otra vez.
 */
export function WelcomeTour({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  const [i, setI] = useState(0)
  const pantalla = PANTALLAS[i]
  const Icono = pantalla.icono
  const ultima = i === PANTALLAS.length - 1

  function cerrar() {
    marcarTourVisto()
    setI(0)
    onCerrar()
  }

  return (
    <Sheet open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Cómo funciona REBOTEAPP</SheetTitle>
          <SheetDescription className="sr-only">
            Un repaso corto de cada sección de la app.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6 pt-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15">
              <Icono className="size-8 text-primary" />
            </span>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{pantalla.titulo}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pantalla.texto}
              </p>
            </div>
          </div>

          {/* dónde estás dentro del recorrido */}
          <div className="flex justify-center gap-1.5" aria-hidden>
            {PANTALLAS.map((p, n) => (
              <span
                key={p.titulo}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  n === i ? 'w-5 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-11 flex-1" onClick={cerrar}>
              {ultima ? 'Cerrar' : 'Saltar'}
            </Button>

            <Button
              className="h-11 flex-1"
              onClick={() => (ultima ? cerrar() : setI((n) => n + 1))}
            >
              {ultima ? 'Empezar' : 'Siguiente'}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Puedes volver a verlo desde tu perfil.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

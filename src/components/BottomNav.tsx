import { Home, ListOrdered, MapPin, Megaphone, Swords } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Cinco secciones es el máximo que cabe cómodo en una barra de móvil. El perfil
// no está aquí: se llega por el avatar de la esquina superior derecha.
const ENLACES = [
  { a: '/social', icono: Home, texto: 'Social' },
  { a: '/partidos', icono: Swords, texto: 'Partidos' },
  { a: '/tablon', icono: Megaphone, texto: 'Tablón' },
  { a: '/ranking', icono: ListOrdered, texto: 'Ranking' },
  { a: '/canchas', icono: MapPin, texto: 'Canchas' },
]

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {ENLACES.map(({ a, icono: Icono, texto }) => (
          <NavLink
            key={a}
            to={a}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs',
                isActive ? 'text-court' : 'text-muted-foreground',
              )
            }
          >
            <Icono className="size-5" />
            {texto}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

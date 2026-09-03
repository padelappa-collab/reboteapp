import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { CourtCard } from './CourtCard'
import { CourtMap } from './CourtMap'
import { useCourts } from './useCourts'

export default function CourtsPage() {
  const { perfil } = useAuth()
  const { canchas, cargando } = useCourts(perfil?.ciudad)
  const [seleccionada, setSeleccionada] = useState<string | null>(null)
  const fichas = useRef<Record<string, HTMLDivElement | null>>({})

  // al tocar un punto del mapa, traer su ficha a la vista
  useEffect(() => {
    if (!seleccionada) return
    fichas.current[seleccionada]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [seleccionada])

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold">Canchas</h1>
      <p className="text-sm text-muted-foreground">
        Dónde se juega en {perfil?.ciudad}. Las reservas las maneja cada club.
      </p>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!cargando && canchas.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay canchas cargadas para esta ciudad.
          </p>
        </div>
      )}

      {!cargando && canchas.length > 0 && (
        <>
          <CourtMap
            canchas={canchas}
            seleccionada={seleccionada}
            onSeleccionar={setSeleccionada}
          />

          <div className="space-y-3">
            {canchas.map((c) => (
              <div
                key={c.id}
                ref={(el) => {
                  fichas.current[c.id] = el
                }}
              >
                <CourtCard
                  cancha={c}
                  destacada={c.id === seleccionada}
                  onVerEnMapa={() => setSeleccionada(c.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { CourtCard } from './CourtCard'
import { CourtMap } from './CourtMap'
import { useCourts } from './useCourts'

export default function CourtsPage() {
  const { perfil } = useAuth()
  const { canchas, cargando } = useCourts(perfil?.ciudad)

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold">Canchas</h1>
      <p className="text-sm text-muted-foreground">
        Dónde se juega en {perfil?.ciudad}. Las reservas las maneja cada club.
      </p>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-56 w-full" />
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
          <CourtMap canchas={canchas} />
          <div className="space-y-3">
            {canchas.map((c) => (
              <CourtCard key={c.id} cancha={c} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

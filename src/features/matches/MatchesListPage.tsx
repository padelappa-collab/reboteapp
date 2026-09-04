import { Plus, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MatchCard } from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { useMisPartidos } from './useMatches'

export default function MatchesListPage() {
  const { perfil } = useAuth()
  const { partidos, nombres, cargando, error } = useMisPartidos(perfil?.id)

  const pendientes = partidos.filter((p) => p.estado !== 'confirmado')
  const confirmados = partidos.filter((p) => p.estado === 'confirmado')

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mis partidos</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/torneos">
              <Trophy className="size-4" />
              Torneos
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/partidos/nuevo">
              <Plus className="size-4" />
              Registrar
            </Link>
          </Button>
        </div>
      </div>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!cargando && partidos.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no has registrado partidos. El primero te da una insignia.
          </p>
        </div>
      )}

      {pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Esperando confirmación
          </h2>
          {pendientes.map((p) => (
            <MatchCard key={p.id} partido={p} nombres={nombres} usuarioId={perfil!.id} />
          ))}
        </section>
      )}

      {confirmados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Confirmados</h2>
          {confirmados.map((p) => (
            <MatchCard key={p.id} partido={p} nombres={nombres} usuarioId={perfil!.id} />
          ))}
        </section>
      )}
    </div>
  )
}

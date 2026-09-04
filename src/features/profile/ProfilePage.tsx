import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/useAuth'
import { BadgeGrid } from '@/features/badges/BadgeGrid'
import { EloCard } from './EloCard'

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ProfilePage() {
  const { perfil } = useAuth()
  if (!perfil) return null

  const eloBase = perfil.genero === 'masculino' ? perfil.elo_masculino : perfil.elo_femenino
  const peakBase =
    perfil.genero === 'masculino' ? perfil.peak_elo_masculino : perfil.peak_elo_femenino

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar className="size-14">
          <AvatarFallback>{iniciales(perfil.nombre)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">{perfil.nombre}</h1>
          <p className="text-sm text-muted-foreground">{perfil.ciudad}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {perfil.numero_registro <= 100 && (
          <Badge variant="secondary">Fundador #{perfil.numero_registro}</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {perfil.partidos_jugados === 0
            ? 'Sin partidos todavía'
            : `${perfil.partidos_jugados} partidos jugados`}
        </span>
      </div>

      <div className="space-y-3">
        {eloBase !== null && peakBase !== null && (
          <EloCard ranking={perfil.genero} elo={eloBase} peakElo={peakBase} />
        )}
        <EloCard ranking="mixto" elo={perfil.elo_mixto} peakElo={perfil.peak_elo_mixto} />
      </div>

      <p className="text-xs text-muted-foreground">
        Los tres rankings se mueven por separado: cada partido solo afecta al que
        corresponde a su tipo.
      </p>

      <BadgeGrid userId={perfil.id} />
    </div>
  )
}

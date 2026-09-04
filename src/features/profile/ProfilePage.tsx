import { LogOut, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { BadgeGrid } from '@/features/badges/BadgeGrid'
import { FollowsCard } from '@/features/feed/FollowsCard'
import { MyPostsGrid } from '@/features/feed/MyPostsGrid'
import { SolicitudesCard } from '@/features/feed/SolicitudesCard'
import { InstallCard } from '@/features/install/InstallCard'
import { PushCard } from '@/features/notifications/PushCard'
import { AvatarUploader } from './AvatarUploader'
import { EloCard } from './EloCard'
import { ProfileSettingsSheet } from './ProfileSettingsSheet'

export default function ProfilePage() {
  const { perfil, cerrarSesion } = useAuth()
  if (!perfil) return null

  const eloBase = perfil.genero === 'masculino' ? perfil.elo_masculino : perfil.elo_femenino
  const peakBase =
    perfil.genero === 'masculino' ? perfil.peak_elo_masculino : perfil.peak_elo_femenino

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <AvatarUploader />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{perfil.nombre}</h1>
          {perfil.username && (
            <p className="truncate text-sm text-muted-foreground">@{perfil.username}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {perfil.ciudad} · cuenta {perfil.cuenta_privada ? 'privada' : 'pública'}
          </p>
        </div>
      </div>

      <FollowsCard userId={perfil.id} />

      <div className="flex flex-wrap items-center gap-2">
        <ProfileSettingsSheet />
        {perfil.numero_registro <= 100 && (
          <Badge variant="secondary">Fundador #{perfil.numero_registro}</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {perfil.partidos_jugados === 0
            ? 'Sin partidos todavía'
            : `${perfil.partidos_jugados} partidos jugados`}
        </span>
      </div>

      {/* lo que espera respuesta va primero: si no, se pierde debajo de todo */}
      <SolicitudesCard />

      <MyPostsGrid />

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

      <Button asChild variant="outline" className="h-11 w-full">
        <Link to="/canchas">
          <MapPin className="size-4" />
          Canchas de {perfil.ciudad}
        </Link>
      </Button>

      {/* instalar va antes: en iPhone el push no existe sin ella */}
      <InstallCard />

      <PushCard />

      <Button
        variant="ghost"
        className="h-11 w-full text-destructive"
        onClick={cerrarSesion}
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  )
}

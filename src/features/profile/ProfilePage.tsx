import { LogOut, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { BadgeGrid } from '@/features/badges/BadgeGrid'
import { SolicitudesCard } from '@/features/feed/SolicitudesCard'
import { EloCard } from './EloCard'
import { ProfileSettingsSheet } from './ProfileSettingsSheet'

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ProfilePage() {
  const { perfil, cerrarSesion } = useAuth()
  if (!perfil) return null

  const eloBase = perfil.genero === 'masculino' ? perfil.elo_masculino : perfil.elo_femenino
  const peakBase =
    perfil.genero === 'masculino' ? perfil.peak_elo_masculino : perfil.peak_elo_femenino

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-16">
          {perfil.foto_url && <AvatarImage src={perfil.foto_url} alt="" />}
          <AvatarFallback>{iniciales(perfil.nombre)}</AvatarFallback>
        </Avatar>

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

      {!perfil.username && (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Todavía no tienes nombre de usuario. Es lo que permite que te encuentren sin
          confundirte con otro jugador del mismo nombre.
        </p>
      )}

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

      <SolicitudesCard />

      <Button asChild variant="outline" className="h-11 w-full">
        <Link to="/canchas">
          <MapPin className="size-4" />
          Canchas de {perfil.ciudad}
        </Link>
      </Button>

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

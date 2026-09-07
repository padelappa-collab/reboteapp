import { HelpCircle, LogOut, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { BadgeGrid } from '@/features/badges/BadgeGrid'
import { MyPostsGrid } from '@/features/feed/MyPostsGrid'
import { SolicitudesCard } from '@/features/feed/SolicitudesCard'
import { InstallCard } from '@/features/install/InstallCard'
import { WelcomeTour } from '@/features/onboarding/WelcomeTour'
import { PushCard } from '@/features/notifications/PushCard'
import { CategoryBadge } from '@/components/CategoryBadge'
import { AvatarUploader } from './AvatarUploader'
import { ProfileStats } from './ProfileStats'
import { EloCard } from './EloCard'
import { ProfileSettingsSheet } from './ProfileSettingsSheet'

export default function ProfilePage() {
  const { perfil, cerrarSesion } = useAuth()
  // antes del retorno temprano: los hooks no pueden ir detras de un return
  const [tour, setTour] = useState(false)

  if (!perfil) return null

  const eloBase = perfil.genero === 'masculino' ? perfil.elo_masculino : perfil.elo_femenino
  const peakBase =
    perfil.genero === 'masculino' ? perfil.peak_elo_masculino : perfil.peak_elo_femenino

  return (
    <div className="space-y-5 pb-4">
      {/*
        Orden de perfil social: quién eres, tus números, y tus publicaciones.
        Lo de pádel va debajo. El perfil es la cara que enseñas a los demás; el
        ELO tiene su propia pantalla en Ranking y sus tarjetas más abajo.
      */}
      <div className="flex items-center gap-3">
        <AvatarUploader />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{perfil.nombre}</h1>
          <p className="truncate text-sm text-muted-foreground">
            @{perfil.username}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* La píldora del ELO evita que el número que define a un jugador
                quede enterrado bajo la rejilla de fotos. */}
            {eloBase !== null && peakBase !== null && (
              <CategoryBadge
                elo={eloBase}
                ranking={perfil.genero}
                peakElo={peakBase}
              />
            )}
            <span className="numero text-sm">{eloBase ?? perfil.elo_mixto}</span>
            <span className="text-xs text-muted-foreground">
              · {perfil.ciudad} · {perfil.cuenta_privada ? 'privada' : 'pública'}
            </span>
          </div>
        </div>
      </div>

      <ProfileStats userId={perfil.id} />

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

      {/* lo que espera respuesta va antes: si no, se pierde debajo de todo */}
      <SolicitudesCard />

      <MyPostsGrid />

      <div className="h-px bg-border" />

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
        variant="outline"
        className="h-11 w-full"
        onClick={() => setTour(true)}
      >
        <HelpCircle className="size-4" />
        Cómo funciona REBOTEAPP
      </Button>

      <WelcomeTour abierto={tour} onCerrar={() => setTour(false)} />

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

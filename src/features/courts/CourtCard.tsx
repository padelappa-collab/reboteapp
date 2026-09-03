import { Crosshair, ExternalLink, MapPin, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CourtRow } from '@/types/database'

/**
 * Ficha informativa de una cancha.
 *
 * REBOTEAPP no gestiona reservas: los clubes ya usan Playtomic. El botón
 * "Reservar" abre el enlace externo del club y ahí termina nuestra parte.
 */
export function CourtCard({
  cancha,
  destacada,
  onVerEnMapa,
}: {
  cancha: CourtRow
  destacada?: boolean
  onVerEnMapa?: () => void
}) {
  const tieneUbicacion = cancha.lat !== null && cancha.lng !== null
  const mapa =
    cancha.lat !== null && cancha.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${cancha.lat},${cancha.lng}`
      : null

  return (
    <Card className={cn('transition-shadow', destacada && 'ring-2 ring-primary')}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-medium">{cancha.nombre}</h2>
            {cancha.direccion && (
              <p className="text-sm text-muted-foreground">{cancha.direccion}</p>
            )}
          </div>
          {cancha.cantidad_canchas !== null && (
            <Badge variant="secondary" className="shrink-0">
              {cancha.cantidad_canchas}{' '}
              {cancha.cantidad_canchas === 1 ? 'cancha' : 'canchas'}
            </Badge>
          )}
        </div>

        {!cancha.verificado && (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Datos por confirmar con el club.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {cancha.booking_url && (
            <Button asChild size="sm" className="h-10">
              <a href={cancha.booking_url} target="_blank" rel="noreferrer noopener">
                Reservar
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
          {tieneUbicacion && onVerEnMapa && (
            <Button size="sm" variant="outline" className="h-10" onClick={onVerEnMapa}>
              <Crosshair className="size-4" />
              Ver en el mapa
            </Button>
          )}
          {mapa && (
            <Button asChild size="sm" variant="outline" className="h-10">
              <a href={mapa} target="_blank" rel="noreferrer noopener">
                <MapPin className="size-4" />
                Cómo llegar
              </a>
            </Button>
          )}
          {cancha.telefono && (
            <Button asChild size="sm" variant="outline" className="h-10">
              <a href={`tel:${cancha.telefono}`}>
                <Phone className="size-4" />
                Llamar
              </a>
            </Button>
          )}
        </div>

        {!cancha.booking_url && (
          <p className="text-xs text-muted-foreground">
            Este club todavía no tiene enlace de reserva. Escríbeles directamente.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

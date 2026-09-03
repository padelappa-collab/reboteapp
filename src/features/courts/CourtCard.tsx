import { Crosshair, ExternalLink, MapPin, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CourtRow } from '@/types/database'

/**
 * Ficha informativa de una cancha.
 *
 * REBOTEAPP no gestiona reservas: los clubes ya usan Playtomic, EasyCancha o
 * simplemente WhatsApp. El boton principal abre el enlace externo del club y
 * ahi termina nuestra parte.
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
  const mapa = tieneUbicacion
    ? `https://www.google.com/maps/search/?api=1&query=${cancha.lat},${cancha.lng}`
    : null

  // si no hay reserva en linea, el WhatsApp pasa a ser la via principal
  const reservaEnLinea = cancha.booking_url
  const chat = cancha.whatsapp
  const sinReserva = !reservaEnLinea && !chat

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

        {cancha.nota && <p className="text-sm">{cancha.nota}</p>}

        {!cancha.verificado && (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Datos por confirmar con el club.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {reservaEnLinea && (
            <Button asChild size="sm" className="h-10">
              <a href={reservaEnLinea} target="_blank" rel="noreferrer noopener">
                Reservar
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}

          {chat && (
            <Button
              asChild
              size="sm"
              variant={reservaEnLinea ? 'outline' : 'default'}
              className="h-10"
            >
              <a href={chat} target="_blank" rel="noreferrer noopener">
                <MessageCircle className="size-4" />
                {reservaEnLinea ? 'WhatsApp' : 'Reservar por WhatsApp'}
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
        </div>

        {sinReserva && (
          <p className="text-xs text-muted-foreground">
            Este club todavía no tiene enlace de reserva.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

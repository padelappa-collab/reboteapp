import { CalendarDays, ChevronRight, LogOut, MapPin, Swords, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  apuntarse,
  cuartetoDe,
  salirPublicacion,
  type PublicacionConDatos,
} from './board.api'

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Quiénes van, sin repetir a nadie. */
export function quienesVan(p: PublicacionConDatos) {
  return [
    ...new Map(
      [
        { id: p.user_id, nombre: p.autor?.nombre ?? '…' },
        ...p.acompanantesJugadores,
        ...p.apuntados,
      ].map((j) => [j.id, j]),
    ).values(),
  ]
}

export function PostCard({
  publicacion,
  usuarioId,
  onCambio,
  /** En la ficha ya estamos dentro: no hace falta el enlace para entrar. */
  conEnlace = true,
}: {
  publicacion: PublicacionConDatos
  usuarioId: string
  onCambio: () => void
  conEnlace?: boolean
}) {
  const [enviando, setEnviando] = useState(false)
  const navegar = useNavigate()

  const van = quienesVan(publicacion)
  const libres = Math.max(0, 4 - van.length)
  const voy = van.some((j) => j.id === usuarioId)

  async function unirme() {
    setEnviando(true)
    try {
      await apuntarse(publicacion.id, usuarioId)
      toast.success('Te uniste al partido')
      onCambio()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo unir')
    } finally {
      setEnviando(false)
    }
  }

  async function salirme() {
    setEnviando(true)
    try {
      await salirPublicacion(publicacion.id)
      toast.info('Saliste del partido')
      onCambio()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo salir')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{publicacion.autor?.nombre ?? '…'}</p>
            <Badge variant="secondary" className="mt-1">
              {libres > 0
                ? `${libres === 1 ? 'Falta' : 'Faltan'} ${libres}`
                : 'Ya son cuatro'}
            </Badge>
          </div>

          {conEnlace && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => navegar(`/tablon/${publicacion.id}`)}
            >
              Ver ficha
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            {fechaLarga(publicacion.fecha_partido)}
          </p>
          {publicacion.cancha && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              {publicacion.cancha.nombre}
            </p>
          )}
          {publicacion.nivel_buscado && (
            <p className="flex items-center gap-2">
              <Users className="size-4 shrink-0" />
              Nivel buscado: {publicacion.nivel_buscado}
            </p>
          )}
        </div>

        {publicacion.nota && <p className="text-sm">{publicacion.nota}</p>}

        <div className="rounded-lg bg-muted p-2 text-sm">
          <span className="text-muted-foreground">Van: </span>
          {van.map((j) => j.nombre).join(', ')}
          {libres > 0 && (
            <span className="text-muted-foreground"> + {libres} por definir</span>
          )}
        </div>

        {publicacion.match_id ? (
          <Button
            variant="secondary"
            className="h-10 w-full"
            onClick={() => navegar(`/partidos/${publicacion.match_id}`)}
          >
            <Swords className="size-4" />
            Ver el partido registrado
          </Button>
        ) : (
          libres === 0 &&
          voy && (
          <Button
            variant="secondary"
            className="h-10 w-full"
            onClick={() =>
              navegar('/partidos/nuevo', {
                state: {
                  jugadores: cuartetoDe(publicacion),
                  canchaId: publicacion.cancha_id,
                  fecha: publicacion.fecha_partido,
                  postId: publicacion.id,
                },
              })
            }
          >
            <Swords className="size-4" />
              Registrar el partido
            </Button>
          )
        )}

        {/* Una sola acción, y dice lo que hace. Quien va se sale solo: la
            publicación sigue para los demás con un cupo más libre. */}
        {publicacion.match_id ? (
          <p className="text-center text-xs text-muted-foreground">
            El resultado ya está registrado. Si necesitas salirte, hazlo desde la
            ficha del partido.
          </p>
        ) : voy ? (
          <Button
            variant="ghost"
            className="h-10 w-full text-destructive"
            disabled={enviando}
            onClick={salirme}
          >
            <LogOut className="size-4" />
            Salirme del partido
          </Button>
        ) : (
          libres > 0 && (
            <Button className="h-10 w-full" disabled={enviando} onClick={unirme}>
              Unirme al partido
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}

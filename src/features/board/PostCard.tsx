import { CalendarDays, Check, MapPin, Swords, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  apuntarse,
  cambiarEstado,
  cuartetoDe,
  desapuntarse,
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

export function PostCard({
  publicacion,
  usuarioId,
  onCambio,
}: {
  publicacion: PublicacionConDatos
  usuarioId: string
  onCambio: () => void
}) {
  const [enviando, setEnviando] = useState(false)
  const navegar = useNavigate()

  const libres = Math.max(0, publicacion.faltan - publicacion.apuntados.length)
  const esMio = publicacion.user_id === usuarioId
  const yaApuntado = publicacion.apuntados.some((a) => a.id === usuarioId)
  const esAcompanante = publicacion.acompanantes.includes(usuarioId)
  const participo = esMio || yaApuntado || esAcompanante
  const cerrado = publicacion.estado !== 'abierto'

  async function alternar() {
    setEnviando(true)
    try {
      if (yaApuntado) {
        await desapuntarse(publicacion.id, usuarioId)
      } else {
        await apuntarse(publicacion.id, usuarioId)
        toast.success('Te apuntaste. Ponte de acuerdo con quien publicó.')
      }
      onCambio()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar')
    } finally {
      setEnviando(false)
    }
  }

  async function cerrar() {
    setEnviando(true)
    try {
      await cambiarEstado(publicacion.id, 'completo')
      toast.success('Publicación cerrada')
      onCambio()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar')
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
                ? `${libres === 1 ? 'Falta' : 'Faltan'} ${libres} de ${publicacion.faltan}`
                : 'Cupo completo'}
            </Badge>
          </div>
          {cerrado && <Badge variant="outline">Cerrada</Badge>}
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
          {[
            publicacion.autor?.nombre ?? '…',
            ...publicacion.acompanantesJugadores.map((j) => j.nombre),
            ...publicacion.apuntados.map((j) => j.nombre),
          ].join(', ')}
          {libres > 0 && (
            <span className="text-muted-foreground">
              {' '}
              + {libres} por definir
            </span>
          )}
        </div>

        {/* registrar el partido solo tiene sentido para quien va a jugarlo */}
        {libres === 0 && participo && (
          <Button
            variant="secondary"
            className="h-10 w-full"
            onClick={() =>
              navegar('/partidos/nuevo', {
                state: {
                  jugadores: cuartetoDe(publicacion),
                  canchaId: publicacion.cancha_id,
                  fecha: publicacion.fecha_partido,
                },
              })
            }
          >
            <Swords className="size-4" />
            Registrar el partido
          </Button>
        )}

        {/* aunque el cupo este lleno hay que poder bajarse: el cierre es
            automatico y si no, quedarias atrapado en el partido */}
        {(!cerrado || yaApuntado) && (
          <div className="flex gap-2">
            {/* con el cupo lleno ya no se puede entrar, pero quien está
                apuntado tiene que poder bajarse */}
            {/* quien ya va —autor o acompañante— no puede ocupar un cupo */}
            {!esMio && !esAcompanante && (libres > 0 || yaApuntado) && (
              <Button
                className="h-10 flex-1"
                variant={yaApuntado ? 'outline' : 'default'}
                disabled={enviando}
                onClick={alternar}
              >
                {yaApuntado ? (
                  <>
                    <Check className="size-4" />
                    Apuntado
                  </>
                ) : (
                  'Me apunto'
                )}
              </Button>
            )}
            {esMio && !cerrado && (
              <Button
                variant="outline"
                className="h-10 flex-1"
                disabled={enviando}
                onClick={cerrar}
              >
                Cerrar publicación
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { Check, CircleAlert, LogOut, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { ETIQUETA_RANKING } from '@/lib/matchType'
import { cn } from '@/lib/utils'
import {
  borrarPartido,
  cancelarPartido,
  confirmarPartido,
  disputarPartido,
} from './matches.api'
import { usePartido } from './useMatches'

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil, refrescarPerfil } = useAuth()
  const navegar = useNavigate()
  const { partido, nombres, cargando, setPartido } = usePartido(id)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <Skeleton className="h-64 w-full" />
  if (!partido) return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>

  const yo = perfil!.id
  const jugadores = [...partido.pareja_a, ...partido.pareja_b]
  const soyJugador = jugadores.includes(yo)
  const yaConfirme = partido.resultado_confirmado_por.includes(yo)
  const faltan = 4 - partido.resultado_confirmado_por.length
  const nombre = (uid: string) => nombres.get(uid) ?? '…'

  async function confirmar() {
    setEnviando(true)
    try {
      const actualizado = await confirmarPartido(partido!.id)
      setPartido(actualizado)
      if (actualizado.estado === 'confirmado') {
        await refrescarPerfil()
        toast.success('Resultado confirmado por los 4. El ELO ya se actualizó.')
      } else {
        toast.success('Confirmaste. Faltan los demás.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo confirmar')
    } finally {
      setEnviando(false)
    }
  }

  async function disputar() {
    setEnviando(true)
    try {
      setPartido(await disputarPartido(partido!.id))
      toast.info('Partido marcado en disputa. Quien lo creó puede borrarlo y registrarlo bien.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo disputar')
    } finally {
      setEnviando(false)
    }
  }

  async function salirme() {
    setEnviando(true)
    try {
      setPartido(await cancelarPartido(partido!.id))
      toast.info('Saliste del partido. Queda cancelado para los cuatro.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar')
    } finally {
      setEnviando(false)
    }
  }

  async function borrar() {
    setEnviando(true)
    try {
      await borrarPartido(partido!.id)
      toast.success('Partido borrado')
      navegar('/partidos', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Partido</h1>
        <Badge variant="outline">{ETIQUETA_RANKING[partido.match_type]}</Badge>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {new Date(partido.fecha).toLocaleString('es-CO', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>

          <table className="w-full text-sm">
            <tbody>
              {(['a', 'b'] as const).map((lado) => (
                <tr key={lado} className={cn(partido.ganador === lado && 'font-medium')}>
                  <td className="py-1">
                    {nombre(partido[`pareja_${lado}`][0])} y{' '}
                    {nombre(partido[`pareja_${lado}`][1])}
                  </td>
                  {partido.sets.map((s, i) => (
                    <td key={i} className="w-8 py-1 text-center tabular-nums">
                      {s[lado]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jugadores.map((uid) => {
            const confirmado = partido.resultado_confirmado_por.includes(uid)
            return (
              <div key={uid} className="flex items-center justify-between text-sm">
                <span>
                  {nombre(uid)}
                  {uid === yo && ' (tú)'}
                </span>
                {confirmado ? (
                  <span className="flex items-center gap-1 text-primary">
                    <Check className="size-4" />
                    confirmó
                  </span>
                ) : (
                  <span className="text-muted-foreground">pendiente</span>
                )}
              </div>
            )
          })}

          {partido.estado === 'pendiente' && (
            <p className="pt-2 text-xs text-muted-foreground">
              El ELO se mueve cuando confirmen los 4. Faltan {faltan}.
            </p>
          )}

          {partido.estado === 'confirmado' && (
            <p className="pt-2 text-xs text-primary">
              Confirmado. El ranking {ETIQUETA_RANKING[partido.match_type].toLowerCase()} ya
              se actualizó.
            </p>
          )}

          {partido.estado === 'cancelado' && (
            <p className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {partido.cancelado_por === yo
                ? 'Cancelaste este partido. No cuenta para el ranking.'
                : `${nombre(partido.cancelado_por ?? '')} se salió del partido. No cuenta para el ranking.`}
            </p>
          )}

          {partido.estado === 'disputado' && (
            <p className="flex items-start gap-2 pt-2 text-xs text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              Alguien no está de acuerdo con el marcador. Nadie puede confirmarlo: hay que
              borrarlo y registrarlo de nuevo.
            </p>
          )}
        </CardContent>
      </Card>

      {soyJugador && partido.estado === 'pendiente' && (
        <div className="grid gap-2">
          {!yaConfirme && (
            <Button className="h-11 w-full" disabled={enviando} onClick={confirmar}>
              Confirmar resultado
            </Button>
          )}
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={enviando}
            onClick={disputar}
          >
            No estoy de acuerdo con el marcador
          </Button>
          <Button
            variant="ghost"
            className="h-11 w-full text-destructive"
            disabled={enviando}
            onClick={salirme}
          >
            <LogOut className="size-4" />
            Salirme del partido
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Un partido necesita cuatro jugadores: si te sales, queda cancelado para
            todos.
          </p>
        </div>
      )}

      {partido.creado_por === yo && partido.estado !== 'confirmado' && (
        <Button
          variant="ghost"
          className="h-11 w-full text-destructive"
          disabled={enviando}
          onClick={borrar}
        >
          <Trash2 className="size-4" />
          Borrar partido
        </Button>
      )}
    </div>
  )
}

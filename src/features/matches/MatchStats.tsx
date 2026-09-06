import { Flame, Snowflake, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { EstadisticasRow } from '@/types/database'

async function estadisticasDe(userId: string): Promise<EstadisticasRow | null> {
  const { data, error } = await supabase.rpc('estadisticas_de', { p_usuario: userId })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

function Dato({
  valor,
  etiqueta,
  className,
}: {
  valor: string
  etiqueta: string
  className?: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className={cn('numero text-2xl leading-none', className)}>{valor}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
    </div>
  )
}

/**
 * El resumen de tus partidos.
 *
 * Sale entero de lo que ya está guardado: no hay contadores que mantener al
 * día, que es lo que se desincroniza en cuanto alguien corrige un marcador.
 * Solo cuentan los confirmados; uno pendiente todavía puede cambiar.
 *
 * Se esconde con cero partidos: unas estadísticas en blanco no dicen nada y
 * ocupan justo el sitio donde debería estar la invitación a registrar el
 * primero.
 */
export function MatchStats({ userId }: { userId: string }) {
  const [datos, setDatos] = useState<EstadisticasRow | null | undefined>(undefined)

  useEffect(() => {
    let vigente = true
    estadisticasDe(userId)
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setDatos(null))
    return () => {
      vigente = false
    }
  }, [userId])

  if (datos === undefined) return <Skeleton className="h-28 w-full" />
  if (!datos || datos.jugados === 0) return null

  const acierto = Math.round((datos.ganados / datos.jugados) * 100)
  const enRacha = datos.racha > 0
  const IconoRacha = enRacha ? Flame : Snowflake
  const IconoElo = datos.elo_movido >= 0 ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-stretch gap-2">
          <Dato valor={String(datos.jugados)} etiqueta="Jugados" />
          <div className="w-px self-center bg-border" style={{ height: '2.25rem' }} />
          <Dato valor={String(datos.ganados)} etiqueta="Ganados" />
          <div className="w-px self-center bg-border" style={{ height: '2.25rem' }} />
          <Dato
            valor={`${acierto}%`}
            etiqueta="Acierto"
            // el neón solo aquí: es el número que resume todo lo demás
            className={acierto >= 50 ? 'text-primary' : undefined}
          />
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <IconoRacha
              className={cn(
                'size-4 shrink-0',
                enRacha ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <span className="text-muted-foreground">
              {Math.abs(datos.racha) === 1
                ? enRacha
                  ? 'Vienes de ganar'
                  : 'Vienes de perder'
                : enRacha
                  ? `${Math.abs(datos.racha)} victorias seguidas`
                  : `${Math.abs(datos.racha)} derrotas seguidas`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <IconoElo className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {datos.elo_movido === 0 ? (
                'Tu ELO está donde empezó'
              ) : (
                <>
                  <span className="numero text-foreground">
                    {datos.elo_movido > 0 ? '+' : ''}
                    {datos.elo_movido}
                  </span>{' '}
                  de ELO desde tu primer partido
                </>
              )}
            </span>
          </div>

          {datos.companero_id && datos.companero_nombre && (
            <div className="flex items-center gap-2">
              <Users className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                Con{' '}
                <Link
                  to={`/jugador/${datos.companero_id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {datos.companero_nombre}
                </Link>{' '}
                ganas{' '}
                <span className="numero text-foreground">
                  {datos.companero_ganados}
                </span>{' '}
                de{' '}
                <span className="numero text-foreground">
                  {datos.companero_jugados}
                </span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

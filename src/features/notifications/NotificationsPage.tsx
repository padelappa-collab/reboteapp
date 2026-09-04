import { CheckCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import {
  borrarNovedad,
  ICONO_NOVEDAD,
  marcarLeida,
  marcarTodasLeidas,
  novedadesDe,
  type Novedad,
} from './notifications.api'

function hace(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias < 7) return `hace ${dias} d`
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [lista, setLista] = useState<Novedad[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!perfil) return
    setCargando(true)
    try {
      setLista(await novedadesDe(perfil.id))
    } catch (error) {
      console.error('No se pudieron cargar las novedades', error)
    } finally {
      setCargando(false)
    }
  }, [perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  const sinLeer = lista.filter((n) => !n.leida).length

  async function abrir(n: Novedad) {
    if (!n.leida) {
      // se marca al instante; si falla la red, no vale la pena molestar
      setLista((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)))
      marcarLeida(n.id).catch(() => {})
    }
    if (n.enlace) navegar(n.enlace)
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Novedades</h1>
        {sinLeer > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={async () => {
              await marcarTodasLeidas(perfil!.id)
              await cargar()
            }}
          >
            <CheckCheck className="size-4" />
            Marcar todas
          </Button>
        )}
      </div>

      {cargando && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!cargando && lista.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No tienes novedades. Aquí te avisamos cuando alguien te agregue a un
            partido, te siga, comente tus publicaciones o ganes una insignia.
          </p>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {lista.map((n) => (
          <div
            key={n.id}
            className={cn(
              'flex items-start gap-3 p-3',
              !n.leida && 'bg-primary/5',
            )}
          >
            <span className="text-lg leading-none">
              {ICONO_NOVEDAD[n.tipo] ?? '🔔'}
            </span>

            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => abrir(n)}
            >
              <p className={cn('text-sm', !n.leida && 'font-medium')}>{n.titulo}</p>
              {n.cuerpo && (
                <p className="mt-0.5 text-xs text-muted-foreground">{n.cuerpo}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hace(n.created_at)}
              </p>
            </button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Borrar novedad"
              className="size-8 shrink-0"
              onClick={async () => {
                try {
                  await borrarNovedad(n.id)
                  setLista((l) => l.filter((x) => x.id !== n.id))
                } catch {
                  toast.error('No se pudo borrar')
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

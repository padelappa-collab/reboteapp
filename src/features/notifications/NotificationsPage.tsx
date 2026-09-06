import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { BellOff } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { activarPush, esIOS, estaInstalada, estaSuscrito, soportaPush } from '@/lib/push'
import { cn } from '@/lib/utils'
import {
  borrarNovedad,
  ICONO_NOVEDAD,
  ICONO_POR_DEFECTO,
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
  const [ofrecerPush, setOfrecerPush] = useState(false)
  const [activando, setActivando] = useState(false)

  // El permiso se pide aquí y no al entrar a la app: mirando tus avisos, que te
  // ofrezcan recibirlos en el teléfono se entiende solo. Pedirlo de golpe al
  // abrir consigue un "no" por reflejo, y en iPhone eso casi no se revierte.
  useEffect(() => {
    if (!soportaPush() || (esIOS() && !estaInstalada())) return
    estaSuscrito().then((si) => setOfrecerPush(!si))
  }, [])

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
    <div className="flex min-h-[calc(100dvh-var(--cabecera)-5rem)] flex-col space-y-4 pb-4">
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

      {ofrecerPush && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Bell className="mt-0.5 size-5 shrink-0 text-court" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">¿Te avisamos al teléfono?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Así te enteras cuando te pidan confirmar un partido, aunque tengas la
              app cerrada. Hasta que los cuatro confirmen, el ELO no se mueve.
            </p>
            <Button
              size="sm"
              className="mt-2 h-9"
              disabled={activando}
              onClick={async () => {
                setActivando(true)
                try {
                  const fallo = await activarPush(perfil!.id)
                  if (fallo) {
                    toast.error(fallo, { duration: 6000 })
                  } else {
                    toast.success('Listo, te avisaremos al teléfono')
                    setOfrecerPush(false)
                  }
                } finally {
                  setActivando(false)
                }
              }}
            >
              Activar
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ahora no"
            className="size-8 shrink-0"
            onClick={() => {
              // solo por esta visita: mientras sigan apagadas, el ofrecimiento
              // vuelve. Sin avisos, un partido sin confirmar no llega a nadie
              setOfrecerPush(false)
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {cargando && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!cargando && lista.length === 0 && (
        <EmptyState
          icono={BellOff}
          titulo="Sin novedades"
          texto="Aquí te avisamos cuando alguien te agregue a un partido, te siga, comente tus publicaciones o ganes una insignia."
        />
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
            {(() => {
              const Icono = ICONO_NOVEDAD[n.tipo] ?? ICONO_POR_DEFECTO
              return (
                <Icono
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    n.leida ? 'text-muted-foreground' : 'text-court',
                  )}
                />
              )
            })()}

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

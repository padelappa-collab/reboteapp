import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { misConversaciones, type Conversacion } from './messages.api'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function hace(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.round(horas / 24)
  if (dias < 7) return `${dias} d`
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

/** Qué se lee bajo el nombre en la bandeja. */
function resumen(c: Conversacion) {
  if (c.ultimo_at === null) return 'Sin mensajes todavía'
  const texto = c.ultimo_es_post ? 'Una publicación' : (c.ultimo_texto ?? '')
  return c.ultimo_mio ? `Tú: ${texto}` : texto
}

export default function ConversationsPage() {
  const [lista, setLista] = useState<Conversacion[] | null>(null)

  const cargar = useCallback(async () => {
    try {
      setLista(await misConversaciones())
    } catch (error) {
      console.error('No se pudieron cargar las conversaciones', error)
      setLista([])
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Link
          to="/social"
          aria-label="Volver a Social"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Mensajes</h1>
      </div>

      {lista === null && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {lista?.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <MessageCircle className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no tienes conversaciones. Puedes escribirle a cualquiera que
            sigas desde su perfil.
          </p>
        </div>
      )}

      {lista && lista.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-sm">
          {lista.map((c) => (
            <li key={c.conversation_id}>
              <Link
                to={`/mensajes/${c.conversation_id}`}
                className="flex items-center gap-3 p-3"
              >
                <Avatar className="size-11">
                  {c.otro_foto && <AvatarImage src={c.otro_foto} alt="" />}
                  <AvatarFallback className="text-xs">
                    {iniciales(c.otro_nombre)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.otro_username ?? c.otro_nombre}
                  </p>
                  <p
                    className={cn(
                      'truncate text-sm',
                      // lo no leído se lee más oscuro: es la única diferencia
                      // que hace falta para saber qué te falta mirar
                      c.sin_leer > 0
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {resumen(c)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {c.ultimo_at && (
                    <span className="text-xs text-muted-foreground">
                      {hace(c.ultimo_at)}
                    </span>
                  )}
                  {c.sin_leer > 0 && (
                    <span className="numero flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                      {c.sin_leer}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { ArrowLeft, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  enviarMensaje,
  marcarLeida,
  mensajePorId,
  mensajesDe,
  misConversaciones,
  type Conversacion,
  type Mensaje,
} from './messages.api'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** La tarjeta de una publicación compartida dentro de un mensaje. */
function PostCompartido({ mensaje }: { mensaje: Mensaje }) {
  const post = mensaje.post

  if (!post) {
    return (
      <p className="text-sm italic opacity-70">
        La publicación ya no está disponible
      </p>
    )
  }

  return (
    <Link
      to={`/jugador/${post.autor?.id ?? ''}`}
      className="flex items-center gap-2.5 rounded-[var(--radius)] bg-background/70 p-2"
    >
      {post.imagen_url ? (
        <img
          src={post.imagen_url}
          alt=""
          className="size-12 shrink-0 rounded-[calc(var(--radius)-4px)] object-cover"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-[calc(var(--radius)-4px)] bg-muted text-xs text-muted-foreground">
          Sin foto
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">
          {post.autor?.nombre ?? 'Publicación'}
        </span>
        {post.contenido && (
          <span className="block truncate text-xs opacity-70">{post.contenido}</span>
        )}
      </span>
    </Link>
  )
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null)
  const [otro, setOtro] = useState<Conversacion | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const finRef = useRef<HTMLDivElement>(null)

  const alFinal = useCallback(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [])

  const cargar = useCallback(async () => {
    if (!id) return
    try {
      const [lista, conversaciones] = await Promise.all([
        mensajesDe(id),
        misConversaciones(),
      ])
      setMensajes(lista)
      setOtro(conversaciones.find((c) => c.conversation_id === id) ?? null)
      await marcarLeida(id)
    } catch (error) {
      console.error('No se pudo cargar la conversación', error)
      setMensajes([])
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (mensajes) alFinal()
  }, [mensajes, alFinal])

  /**
   * Los mensajes que llegan mientras la pantalla está abierta.
   *
   * Realtime avisa de la fila cruda, sin la publicación resuelta, así que se
   * vuelve a pedir por id: es una consulta mínima y evita tener que duplicar en
   * el cliente la lógica de qué trae cada mensaje.
   */
  useEffect(() => {
    if (!id || !perfil) return

    const canal = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        async (evento) => {
          const nuevo = evento.new as { id: string; sender_id: string }
          // el propio ya se pintó al enviarlo
          if (nuevo.sender_id === perfil.id) return

          const completo = await mensajePorId(nuevo.id)
          if (completo) {
            setMensajes((prev) => [...(prev ?? []), completo])
            marcarLeida(id)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id, perfil])

  if (!perfil || !id) return null

  async function mandar() {
    const limpio = texto.trim()
    if (!limpio || enviando) return

    setEnviando(true)
    setTexto('')
    try {
      await enviarMensaje(id!, perfil!.id, limpio)
      setMensajes(await mensajesDe(id!))
    } catch (error) {
      setTexto(limpio)
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] flex-col">
      <div className="flex items-center gap-2.5 border-b pb-3">
        <Link
          to="/mensajes"
          aria-label="Volver a los mensajes"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>

        {otro && (
          <Link
            to={`/jugador/${otro.otro_id}`}
            className="flex min-w-0 items-center gap-2.5"
          >
            <Avatar className="size-9">
              {otro.otro_foto && <AvatarImage src={otro.otro_foto} alt="" />}
              <AvatarFallback className="text-xs">
                {iniciales(otro.otro_nombre)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {otro.otro_username ?? otro.otro_nombre}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {otro.otro_nombre}
              </span>
            </span>
          </Link>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-3">
        {mensajes === null && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        )}

        {mensajes?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Escríbele lo primero.
          </p>
        )}

        {mensajes?.map((m) => {
          const mio = m.sender_id === perfil.id
          return (
            <div
              key={m.id}
              className={cn('flex', mio ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[78%] space-y-1 rounded-[var(--radius)] px-3 py-2',
                  // el neón muy diluido para lo tuyo: distingue el lado sin
                  // convertir la conversación en un semáforo
                  mio ? 'bg-primary/20' : 'bg-muted',
                )}
              >
                {m.post_compartido_id && <PostCompartido mensaje={m} />}
                {m.contenido && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {m.contenido}
                  </p>
                )}
                <p className="text-right text-[10px] text-muted-foreground">
                  {hora(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={finRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          mandar()
        }}
      >
        <Input
          className="h-11"
          placeholder="Escribe un mensaje"
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Enviar"
          disabled={!texto.trim() || enviando}
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}

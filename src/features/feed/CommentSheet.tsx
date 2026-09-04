import { Send } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { comentar, comentariosDe, type Comentario } from './feed.api'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function CommentSheet({
  postId,
  usuarioId,
  abierto,
  onAbrirChange,
  onComentario,
}: {
  postId: string
  usuarioId: string
  abierto: boolean
  onAbrirChange: (abierto: boolean) => void
  onComentario: () => void
}) {
  const [lista, setLista] = useState<Comentario[]>([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    setCargando(true)

    comentariosDe(postId)
      .then((c) => vigente && setLista(c))
      .catch(() => vigente && toast.error('No se pudieron cargar los comentarios'))
      .finally(() => vigente && setCargando(false))

    return () => {
      vigente = false
    }
  }, [abierto, postId])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return

    setEnviando(true)
    try {
      await comentar(postId, usuarioId, texto)
      setTexto('')
      setLista(await comentariosDe(postId))
      onComentario()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo comentar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={onAbrirChange}>
      <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col">
        <SheetHeader>
          <SheetTitle>Comentarios</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {cargando && <Skeleton className="h-16 w-full" />}

          {!cargando && lista.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nadie ha comentado. Sé el primero.
            </p>
          )}

          {lista.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {iniciales(c.autor?.nombre ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{c.autor?.nombre ?? '…'}</span>{' '}
                  <span className="text-muted-foreground">{c.contenido}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={enviar} className="flex gap-2 border-t p-4">
          <Input
            className="h-11"
            placeholder="Escribe un comentario"
            maxLength={500}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0"
            disabled={enviando || !texto.trim()}
            aria-label="Enviar comentario"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

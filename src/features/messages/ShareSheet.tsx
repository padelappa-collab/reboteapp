import { Check } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { compartirPost, genteParaCompartir, type Candidato } from './messages.api'

/**
 * Compartir una publicación dentro de la app.
 *
 * No abre el menú del sistema: mandar el enlace por WhatsApp saca a la persona
 * de REBOTEAPP y le enseña la publicación a quien no tiene cuenta. Aquí llega
 * como mensaje directo, con una referencia a la publicación y no una copia, así
 * que si el autor la borra el chat no se queda enseñando algo que ya no existe.
 */
export function ShareSheet({
  postId,
  abierto,
  onAbrirChange,
}: {
  postId: string
  abierto: boolean
  onAbrirChange: (abierto: boolean) => void
}) {
  const [gente, setGente] = useState<Candidato[] | null>(null)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setElegidos([])
    genteParaCompartir()
      .then(setGente)
      .catch(() => setGente([]))
  }, [abierto])

  async function enviar() {
    setEnviando(true)
    try {
      const n = await compartirPost(postId, elegidos)
      toast.success(n === 1 ? 'Enviado' : `Enviado a ${n} personas`)
      onAbrirChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar')
    } finally {
      setEnviando(false)
    }
  }

  const mutuos = (gente ?? []).filter((g) => g.mutuo)
  const resto = (gente ?? []).filter((g) => !g.mutuo)

  function fila(g: Candidato) {
    const marcado = elegidos.includes(g.user_id)
    return (
      <button
        key={g.user_id}
        type="button"
        className="flex w-full items-center gap-3 py-2.5 text-left"
        onClick={() =>
          setElegidos((prev) =>
            marcado ? prev.filter((x) => x !== g.user_id) : [...prev, g.user_id],
          )
        }
      >
        <UserAvatar
          id={g.user_id}
          nombre={g.nombre}
          fotoUrl={g.foto_url}
          className="size-10"
          textoClassName="text-xs"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {g.username ?? g.nombre}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {g.nombre}
          </span>
        </span>

        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border',
            marcado ? 'border-primary bg-primary' : 'border-border',
          )}
        >
          {marcado && <Check className="size-3.5 text-primary-foreground" />}
        </span>
      </button>
    )
  }

  return (
    <Sheet open={abierto} onOpenChange={onAbrirChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Enviar a</SheetTitle>
          <SheetDescription>
            Llega como mensaje directo dentro de REBOTEAPP.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-24">
          {gente === null && (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {gente?.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">
              Todavía no sigues a nadie ni te sigue nadie. Busca jugadores desde
              Social para poder compartirles cosas.
            </p>
          )}

          {mutuos.length > 0 && (
            <>
              {/* los mutuos primero: es con quien de verdad se habla */}
              <p className="pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Se siguen mutuamente
              </p>
              <div className="divide-y divide-border">{mutuos.map(fila)}</div>
            </>
          )}

          {resto.length > 0 && (
            <>
              <p className="pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Los demás
              </p>
              <div className="divide-y divide-border">{resto.map(fila)}</div>
            </>
          )}
        </div>

        {elegidos.length > 0 && (
          <div className="sticky bottom-0 border-t bg-card p-4">
            <Button
              className="h-11 w-full"
              disabled={enviando}
              onClick={enviar}
            >
              Enviar a {elegidos.length}{' '}
              {elegidos.length === 1 ? 'persona' : 'personas'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

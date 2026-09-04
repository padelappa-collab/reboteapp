import { Heart, ImageOff, MessageCircle, Swords, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/useAuth'
import {
  borrarPublicacion,
  editarPublicacion,
  publicacionesDe,
  type Publicacion,
} from './feed.api'

/** Cuadrícula de tus publicaciones, para revisarlas, editarlas o borrarlas. */
export function MyPostsGrid() {
  const { perfil } = useAuth()
  const [lista, setLista] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState<Publicacion | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!perfil) return
    setCargando(true)
    try {
      setLista(await publicacionesDe(perfil.id, perfil.id))
    } catch (error) {
      console.error('No se pudieron cargar tus publicaciones', error)
    } finally {
      setCargando(false)
    }
  }, [perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!perfil) return null
  if (cargando) return <Skeleton className="h-40 w-full" />

  function abrir(p: Publicacion) {
    setAbierta(p)
    setTexto(p.contenido ?? '')
  }

  async function guardar() {
    if (!abierta) return
    setEnviando(true)
    try {
      await editarPublicacion(abierta.id, texto.trim() || null)
      toast.success('Publicación actualizada')
      setAbierta(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setEnviando(false)
    }
  }

  async function borrar() {
    if (!abierta) return
    setEnviando(true)
    try {
      await borrarPublicacion(abierta.id)
      toast.success('Publicación borrada')
      setAbierta(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Mis publicaciones</h2>
          <span className="text-sm text-muted-foreground">{lista.length}</span>
        </div>

        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no has publicado nada. Puedes subir una foto desde el feed o
            publicar un partido desde su ficha.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {lista.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => abrir(p)}
                className="relative aspect-square overflow-hidden rounded-md border bg-muted text-left"
              >
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full flex-col justify-between p-2">
                    <span className="text-muted-foreground">
                      {p.match_id ? (
                        <Swords className="size-4" />
                      ) : (
                        <ImageOff className="size-4" />
                      )}
                    </span>
                    <span className="line-clamp-3 text-[11px] leading-tight">
                      {p.contenido ?? 'Partido'}
                    </span>
                  </span>
                )}

                {(p.meGusta > 0 || p.comentarios > 0) && (
                  <span className="absolute bottom-1 right-1 flex gap-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px]">
                    {p.meGusta > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="size-3" />
                        {p.meGusta}
                      </span>
                    )}
                    {p.comentarios > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="size-3" />
                        {p.comentarios}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet open={abierta !== null} onOpenChange={(v) => !v && setAbierta(null)}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar publicación</SheetTitle>
            <SheetDescription>
              Solo se puede cambiar el texto. La foto y el partido quedan como están.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 px-4 pb-6">
            {abierta?.imagen_url && (
              <img
                src={abierta.imagen_url}
                alt=""
                className="max-h-64 w-full rounded-lg object-cover"
              />
            )}

            <Textarea
              rows={4}
              maxLength={500}
              placeholder="Sin texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            <Button
              className="h-11 w-full"
              disabled={enviando || texto === (abierta?.contenido ?? '')}
              onClick={guardar}
            >
              Guardar cambios
            </Button>

            <Button
              variant="ghost"
              className="h-11 w-full text-destructive"
              disabled={enviando}
              onClick={borrar}
            >
              <Trash2 className="size-4" />
              Borrar publicación
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

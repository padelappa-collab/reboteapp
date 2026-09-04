import { ImagePlus, Plus, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/useAuth'
import { crearPublicacion, subirImagen } from './feed.api'

const MAX_MB = 5

export function CreatePostSheet({
  onCreada,
  /** Si la publicación es sobre un partido, se muestra su tarjeta al lado. */
  matchId,
  textoInicial,
  disparador,
}: {
  onCreada: () => void
  matchId?: string
  textoInicial?: string
  disparador?: React.ReactNode
}) {
  const { perfil } = useAuth()
  const entrada = useRef<HTMLInputElement>(null)

  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(textoInicial ?? '')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`La foto no puede pesar más de ${MAX_MB} MB`)
      return
    }

    setArchivo(f)
    setVistaPrevia(URL.createObjectURL(f))
  }

  function quitarFoto() {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia)
    setArchivo(null)
    setVistaPrevia(null)
    if (entrada.current) entrada.current.value = ''
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!perfil) return
    if (!texto.trim() && !archivo && !matchId) return

    setEnviando(true)
    try {
      const imagenUrl = archivo ? await subirImagen(perfil.id, archivo) : null

      await crearPublicacion({
        userId: perfil.id,
        contenido: texto.trim() || null,
        matchId: matchId ?? null,
        imagenUrl,
      })

      toast.success('Publicado')
      setTexto('')
      quitarFoto()
      setAbierto(false)
      onCreada()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar')
    } finally {
      setEnviando(false)
    }
  }

  const vacio = !texto.trim() && !archivo && !matchId

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        {disparador ?? (
          <Button size="sm">
            <Plus className="size-4" />
            Publicar
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{matchId ? 'Publicar el partido' : 'Nueva publicación'}</SheetTitle>
          <SheetDescription>
            {matchId
              ? 'Se publicará con el marcador y los jugadores. Puedes añadir una foto.'
              : 'Cuenta algo, sube una foto, o las dos cosas.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={enviar} className="grid gap-4 px-4 pb-6">
          <Textarea
            rows={4}
            maxLength={500}
            placeholder={
              matchId ? 'Añade algo sobre el partido (opcional)' : '¿Qué quieres contar?'
            }
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />

          {vistaPrevia ? (
            <div className="relative">
              <img
                src={vistaPrevia}
                alt=""
                className="max-h-72 w-full rounded-lg object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Quitar foto"
                className="absolute right-2 top-2 size-9 rounded-full shadow"
                onClick={quitarFoto}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => entrada.current?.click()}
            >
              <ImagePlus className="size-4" />
              Añadir foto
            </Button>
          )}

          <input
            ref={entrada}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={elegirArchivo}
          />

          <Button type="submit" className="h-11 w-full" disabled={enviando || vacio}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

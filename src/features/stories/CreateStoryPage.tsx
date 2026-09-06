import { ArrowLeft, ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { ImageCropper, type RecorteRef } from '@/features/feed/ImageCropper'
import { publicarHistoria } from './stories.api'

const MAXIMO = 8 * 1024 * 1024

/**
 * La proporción de una historia: 9:16, la pantalla completa de un teléfono.
 *
 * No es negociable como en el feed. Una historia se ve a pantalla completa y
 * cualquier otra forma deja franjas negras arriba y abajo, así que el marco es
 * fijo y lo único que se elige es qué parte de la foto queda dentro.
 */
const VERTICAL = 9 / 16

export default function CreateStoryPage() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const entrada = useRef<HTMLInputElement>(null)
  const recorte = useRef<RecorteRef>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!perfil) return null

  function elegir(f: File) {
    if (!f.type.startsWith('image/')) {
      toast.error('Tiene que ser una imagen')
      return
    }
    if (f.size > MAXIMO) {
      toast.error('La foto pesa más de 8 MB')
      return
    }
    setArchivo(f)
  }

  async function publicar() {
    if (!archivo || enviando) return
    setEnviando(true)
    try {
      const recortada = await recorte.current!.recortar()
      const listo = new File([recortada], 'historia.jpg', { type: 'image/jpeg' })
      await publicarHistoria(perfil!.id, listo)
      toast.success('Historia publicada. Dura 24 horas.')
      navegar('/social', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Volver"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navegar(-1)}
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="flex-1 text-xl font-semibold">Nueva historia</h1>
        {archivo && (
          <Button size="sm" className="h-9" disabled={enviando} onClick={publicar}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </Button>
        )}
      </div>

      {!archivo ? (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="flex min-h-72 w-full flex-col items-center justify-center gap-3
                     rounded-[var(--radius)] border border-dashed px-8 text-center"
        >
          <span className="grid size-16 place-items-center rounded-full bg-elevated">
            <ImagePlus className="size-8 text-muted-foreground" strokeWidth={1.5} />
          </span>
          <span className="font-medium">Elige una foto</span>
          <span className="text-sm text-muted-foreground">
            Se verá a pantalla completa y dura 24 horas.
          </span>
        </button>
      ) : (
        <>
          {/* el marco es el mismo que verá quien la abra, así que lo que se
              encuadra aquí es literalmente lo que se va a publicar */}
          <div className="mx-auto max-w-64">
            <ImageCropper ref={recorte} archivo={archivo} proporcion={VERTICAL} />
          </div>

          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => entrada.current?.click()}
          >
            Cambiar de foto
          </Button>
        </>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) elegir(f)
        }}
      />
    </div>
  )
}

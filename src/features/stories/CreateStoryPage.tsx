import { ArrowLeft, ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'
import { ImageCropper, type RecorteRef } from '@/features/feed/ImageCropper'
import {
  SEGUNDOS_MAX,
  duracionDe,
  publicarHistoria,
  publicarVideo,
} from './stories.api'

/** Las fotos se recortan aquí, así que un original grande no es problema. */
const MAXIMO_FOTO = 8 * 1024 * 1024
/**
 * El vídeo se sube tal cual. El tope es generoso porque un clip de 30 s desde
 * un teléfono ronda los 30 MB, y Cloudflare rechaza igual lo que se pase de
 * duración: este límite solo evita que alguien empiece a subir 200 MB por
 * error y lo descubra a los tres minutos.
 */
const MAXIMO_VIDEO = 60 * 1024 * 1024

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
  const [video, setVideo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!perfil) return null

  async function elegir(f: File) {
    if (f.type.startsWith('video/')) {
      if (f.size > MAXIMO_VIDEO) {
        toast.error('El vídeo pesa más de 60 MB. Recórtalo antes de subirlo.')
        return
      }
      // se comprueba aquí para avisar al instante; el tope de verdad lo aplica
      // Cloudflare al recibirlo, que es donde no se puede saltar
      try {
        const segundos = await duracionDe(f)
        if (segundos > SEGUNDOS_MAX + 0.5) {
          toast.error(`El vídeo dura ${Math.round(segundos)} s. El máximo son ${SEGUNDOS_MAX}.`)
          return
        }
      } catch {
        toast.error('No se pudo leer el vídeo')
        return
      }
      setVideo(f)
      setArchivo(null)
      return
    }

    if (!f.type.startsWith('image/')) {
      toast.error('Tiene que ser una imagen o un vídeo')
      return
    }
    if (f.size > MAXIMO_FOTO) {
      toast.error('La foto pesa más de 8 MB')
      return
    }
    setArchivo(f)
    setVideo(null)
  }

  async function publicar() {
    if ((!archivo && !video) || enviando) return
    setEnviando(true)
    try {
      if (video) {
        await publicarVideo(perfil!.id, video)
      } else {
        const recortada = await recorte.current!.recortar()
        const listo = new File(
        [recortada],
        `historia.${recortada.type === 'image/webp' ? 'webp' : 'jpg'}`,
        { type: recortada.type },
      )
        await publicarHistoria(perfil!.id, listo)
      }
      toast.success('Historia publicada. Dura 24 horas.')
      navegar('/social', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-var(--cabecera)-4rem)] flex-col gap-3">
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
        {(archivo || video) && (
          <Button size="sm" className="h-9" disabled={enviando} onClick={publicar}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </Button>
        )}
      </div>

      {!archivo && !video ? (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3
                     rounded-[var(--radius)] border border-dashed px-8 text-center"
        >
          <span className="grid size-16 place-items-center rounded-full bg-elevated">
            <ImagePlus className="size-8 text-muted-foreground" strokeWidth={1.5} />
          </span>
          <span className="font-medium">Elige una foto o un vídeo</span>
          <span className="text-sm text-muted-foreground">
            El vídeo, hasta {SEGUNDOS_MAX} segundos. Se ve a pantalla completa y
            dura 24 horas.
          </span>
        </button>
      ) : video ? (
        <>
          {/* el vídeo no se recorta: se sube tal cual y Cloudflare lo adapta */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <video
              src={URL.createObjectURL(video)}
              playsInline
              controls
              className="max-h-full rounded-[var(--radius)]"
            />
          </div>

          <Button
            variant="outline"
            className="h-11 w-full shrink-0"
            onClick={() => entrada.current?.click()}
          >
            Cambiar
          </Button>
        </>
      ) : (
        <>
          {/* a pantalla completa: el marco es del tamaño y la forma con la que
              se va a ver, no una miniatura de la que hay que fiarse */}
          <div className="flex min-h-0 flex-1 flex-col">
            <ImageCropper
              ref={recorte}
              archivo={archivo!}
              proporcion={VERTICAL}
              llenarAlto
            />
          </div>

          <Button
            variant="outline"
            className="h-11 w-full shrink-0"
            onClick={() => entrada.current?.click()}
          >
            Cambiar
          </Button>
        </>
      )}

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
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

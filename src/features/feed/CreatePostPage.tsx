import { ArrowLeft, ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { crearPublicacion, subirImagen } from './feed.api'
import { ImageCropper, PROPORCIONES, type ProporcionId, type RecorteRef } from './ImageCropper'

const MAXIMO = 8 * 1024 * 1024

/**
 * Publicar una foto: elegir, encuadrar y escribir el pie.
 *
 * Es una pantalla y no una hoja emergente porque encuadrar necesita sitio: con
 * el teclado abierto sobre media pantalla no se puede arrastrar una foto para
 * ver qué queda dentro.
 *
 * El recorte se hace aquí, antes de subir. Lo que llega al servidor ya tiene la
 * forma definitiva, así que el feed no recorta nada y lo que publicas es
 * exactamente lo que viste.
 */
export default function CreatePostPage() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const entrada = useRef<HTMLInputElement>(null)
  const recorte = useRef<RecorteRef>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [proporcion, setProporcion] = useState<ProporcionId>('4:5')
  const [pie, setPie] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!perfil) return null

  const valor = PROPORCIONES.find((p) => p.id === proporcion)!.valor

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
      const listo = new File(
        [recortada],
        `publicacion.${recortada.type === 'image/webp' ? 'webp' : 'jpg'}`,
        { type: recortada.type },
      )
      const url = await subirImagen(perfil!.id, listo)

      await crearPublicacion({
        userId: perfil!.id,
        contenido: pie.trim() || null,
        matchId: null,
        imagenUrl: url,
      })

      toast.success('Publicado')
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
        <h1 className="flex-1 text-xl font-semibold">Nueva publicación</h1>
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
            Después decides qué parte se ve y le pones un pie.
          </span>
        </button>
      ) : (
        <>
          <ImageCropper ref={recorte} archivo={archivo} proporcion={valor} />

          <div className="flex gap-2">
            {PROPORCIONES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProporcion(p.id)}
                className={cn(
                  'h-9 flex-1 rounded-full border text-xs font-medium transition-colors',
                  proporcion === p.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {p.texto}
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Escribe un pie…"
            maxLength={500}
            rows={3}
            value={pie}
            onChange={(e) => setPie(e.target.value)}
          />

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

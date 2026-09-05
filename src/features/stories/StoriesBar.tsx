import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { historiasActivas, publicarHistoria, type AutorConHistorias } from './stories.api'
import { StoryViewer } from './StoryViewer'

const MAXIMO = 5 * 1024 * 1024

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * La fila de historias, arriba del feed.
 *
 * El anillo es de un solo tono y solo dice una cosa: si queda algo por ver. Sin
 * ver, gris oscuro; ya visto, gris muy claro. Un degradado de colores llamaría
 * la atención sobre la barra entera y aquí lo que tiene que destacar es
 * únicamente lo que todavía no miraste.
 *
 * El neón no aparece: en esta pantalla se reserva para el corazón del me gusta.
 */
export function StoriesBar() {
  const { perfil } = useAuth()
  const entrada = useRef<HTMLInputElement>(null)
  const [autores, setAutores] = useState<AutorConHistorias[] | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [viendo, setViendo] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    try {
      setAutores(await historiasActivas())
    } catch (error) {
      console.error('No se pudieron cargar las historias', error)
      setAutores([])
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!perfil) return null

  const mias = autores?.find((a) => a.soy_yo) ?? null
  // el resto de la fila, sin ti: tu círculo se pinta aparte y siempre primero
  const otros = (autores ?? []).filter((a) => !a.soy_yo)

  async function elegida(archivo: File) {
    if (!archivo.type.startsWith('image/')) {
      toast.error('Tiene que ser una imagen')
      return
    }
    if (archivo.size > MAXIMO) {
      toast.error('La foto pesa más de 5 MB')
      return
    }

    setSubiendo(true)
    try {
      await publicarHistoria(perfil!.id, archivo)
      toast.success('Historia publicada. Dura 24 horas.')
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar')
    } finally {
      setSubiendo(false)
    }
  }

  if (autores === null) {
    return (
      <div className="flex gap-3 overflow-hidden py-1">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="size-16 shrink-0 rounded-full" />
        ))}
      </div>
    )
  }

  // el orden que ve el visor tiene que ser el mismo que se pinta
  const fila = mias ? [mias, ...otros] : otros

  return (
    <>
      <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* tu círculo, siempre primero y siempre presente */}
        <button
          type="button"
          className="flex w-16 shrink-0 flex-col items-center gap-1"
          disabled={subiendo}
          onClick={() => {
            if (mias) setViendo(0)
            else entrada.current?.click()
          }}
        >
          <span className="relative">
            <Avatar
              className={cn(
                'size-16',
                mias && mias.sin_ver > 0 && 'ring-2 ring-offset-2 ring-muted-foreground',
                mias && mias.sin_ver === 0 && 'ring-2 ring-offset-2 ring-border',
                subiendo && 'opacity-50',
              )}
            >
              {perfil.foto_url && <AvatarImage src={perfil.foto_url} alt="" />}
              <AvatarFallback>{iniciales(perfil.nombre)}</AvatarFallback>
            </Avatar>

            <span
              className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center
                         rounded-full border-2 border-background bg-court text-white"
              onClick={(e) => {
                // el "+" siempre sube, aunque ya tengas historias que mirar
                e.stopPropagation()
                entrada.current?.click()
              }}
            >
              <Plus className="size-3" />
            </span>
          </span>
          <span className="w-full truncate text-center text-xs text-muted-foreground">
            Tu historia
          </span>
        </button>

        {otros.map((a, i) => (
          <button
            key={a.user_id}
            type="button"
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            onClick={() => setViendo(mias ? i + 1 : i)}
          >
            <Avatar
              className={cn(
                'size-16 ring-2 ring-offset-2',
                // un solo tono, dos intensidades: lo único que hay que saber es
                // si queda algo por ver
                a.sin_ver > 0 ? 'ring-muted-foreground' : 'ring-border',
              )}
            >
              {a.foto_url && <AvatarImage src={a.foto_url} alt="" />}
              <AvatarFallback>{iniciales(a.nombre)}</AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'w-full truncate text-center text-xs',
                a.sin_ver > 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {a.username ?? a.nombre}
            </span>
          </button>
        ))}
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          e.target.value = ''
          if (archivo) elegida(archivo)
        }}
      />

      {viendo !== null && fila.length > 0 && (
        <StoryViewer
          autores={fila}
          indiceInicial={viendo}
          onCerrar={() => {
            setViendo(null)
            cargar()
          }}
        />
      )}
    </>
  )
}

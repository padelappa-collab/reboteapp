import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { colorDeAvatar, iniciales } from '@/components/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { historiasActivas, type AutorConHistorias } from './stories.api'
import { StoryViewer } from './StoryViewer'

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
  const navegar = useNavigate()
  const [autores, setAutores] = useState<AutorConHistorias[] | null>(null)
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
      <div
        data-tour="historias"
        className="-mx-4 flex gap-3.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* tu círculo, siempre primero y siempre presente */}
        <button
          type="button"
          className="flex w-16 shrink-0 flex-col items-center gap-1"
          onClick={() => {
            if (mias) setViendo(0)
            else navegar('/historia/nueva')
          }}
        >
          <span className="relative">
            <Avatar
              className={cn(
                'size-16',
                mias && mias.sin_ver > 0 && 'ring-2 ring-offset-2 ring-anillo',
                mias && mias.sin_ver === 0 && 'ring-2 ring-offset-2 ring-border',
              )}
            >
              {perfil.foto_url && <AvatarImage src={perfil.foto_url} alt="" />}
              <AvatarFallback
                className="font-medium text-white"
                style={{ backgroundColor: colorDeAvatar(perfil.id) }}
              >
                {iniciales(perfil.nombre)}
              </AvatarFallback>
            </Avatar>

            <span
              className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center
                         rounded-full border-2 border-background bg-primary text-primary-foreground"
              onClick={(e) => {
                // el "+" siempre lleva a publicar, aunque ya tengas historias
                // que mirar
                e.stopPropagation()
                navegar('/historia/nueva')
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
                a.sin_ver > 0 ? 'ring-anillo' : 'ring-border',
              )}
            >
              {a.foto_url && <AvatarImage src={a.foto_url} alt="" />}
              <AvatarFallback
                className="font-medium text-white"
                style={{ backgroundColor: colorDeAvatar(a.user_id) }}
              >
                {iniciales(a.nombre)}
              </AvatarFallback>
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

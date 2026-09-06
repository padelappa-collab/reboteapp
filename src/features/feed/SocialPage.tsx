import { MessageCircle, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { mensajesSinLeer } from '@/features/messages/messages.api'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
import { StoriesBar } from '@/features/stories/StoriesBar'
import { UserSearch } from './UserSearch'
import { FeedPostCard } from './FeedPostCard'
import { POR_PAGINA, publicaciones, type Publicacion } from './feed.api'

type Pestana = 'siguiendo' | 'descubrir'

export default function SocialPage() {
  const { perfil } = useAuth()
  // al arrancar el piloto casi nadie sigue a nadie, así que Descubrir es lo
  // primero que se ve; si no, el feed estaría vacío y nadie volvería
  const [pestana, setPestana] = useState<Pestana>('descubrir')
  const [lista, setLista] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [sinLeer, setSinLeer] = useState(0)
  const [hayMas, setHayMas] = useState(true)
  const [trayendo, setTrayendo] = useState(false)

  const pie = useRef<HTMLDivElement>(null)

  const recargar = useCallback(async () => {
    if (!perfil) return
    setCargando(true)
    setHayMas(true)
    try {
      const primeras = await publicaciones(perfil.id, pestana, perfil.ciudad)
      setLista(primeras)
      setHayMas(primeras.length === POR_PAGINA)
    } catch (error) {
      console.error('No se pudo cargar el feed', error)
      setLista([])
      setHayMas(false)
    } finally {
      setCargando(false)
    }
  }, [perfil, pestana])

  /**
   * La tanda siguiente.
   *
   * Se pide por la posición de lo que ya hay, no por página: si alguien publica
   * mientras lees, contar páginas te haría saltarte una o repetirla.
   */
  const traerMas = useCallback(async () => {
    if (!perfil || trayendo || !hayMas || cargando) return
    setTrayendo(true)
    try {
      const mas = await publicaciones(perfil.id, pestana, perfil.ciudad, lista.length)
      // por si dos publicaciones cruzaron la frontera de la tanda
      setLista((prev) => {
        const vistas = new Set(prev.map((p) => p.id))
        return [...prev, ...mas.filter((p) => !vistas.has(p.id))]
      })
      setHayMas(mas.length === POR_PAGINA)
    } catch (error) {
      console.error('No se pudo cargar más', error)
      setHayMas(false)
    } finally {
      setTrayendo(false)
    }
  }, [perfil, pestana, lista.length, trayendo, hayMas, cargando])

  /*
   * El detector del pie.
   *
   * Se dispara un poco antes de llegar al final —200 px— para que la tanda
   * siguiente esté cargada cuando el dedo llegue abajo, en vez de frenar el
   * scroll con un hueco vacío.
   */
  useEffect(() => {
    const nodo = pie.current
    if (!nodo) return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) traerMas()
      },
      { rootMargin: '200px' },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [traerMas])

  useEffect(() => {
    recargar()
  }, [recargar])

  // el punto de mensajes sin leer: se recuenta al entrar a Social, que es el
  // momento en que la persona está mirando esta barra
  useEffect(() => {
    mensajesSinLeer()
      .then(setSinLeer)
      .catch(() => setSinLeer(0))
  }, [])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Social</h1>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              sinLeer > 0 ? `Mensajes, ${sinLeer} sin leer` : 'Mensajes'
            }
          >
            <Link to="/mensajes">
              <MessageCircle className="size-5" />
              {sinLeer > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link to="/publicar">
              <Plus className="size-4" />
              Publicar
            </Link>
          </Button>
        </div>
      </div>

      <UserSearch />

      {/* las historias van arriba del feed: son lo que caduca, y lo que caduca
          se mira primero */}
      <StoriesBar />

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
        <TabsList className="w-full">
          <TabsTrigger value="descubrir" className="flex-1">
            Descubrir
          </TabsTrigger>
          <TabsTrigger value="siguiendo" className="flex-1">
            Siguiendo
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!cargando && lista.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {pestana === 'siguiendo'
              ? 'Todavía no sigues a nadie que haya publicado. Búscalos aquí arriba.'
              : `Aún no hay publicaciones en ${perfil?.ciudad}. Publica la primera.`}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {lista.map((p) => (
          <FeedPostCard
            key={p.id}
            publicacion={p}
            usuarioId={perfil!.id}
            onCambio={recargar}
          />
        ))}
      </div>

      {/* el pie que dispara la tanda siguiente al acercarse */}
      <div ref={pie} className="py-4">
        {trayendo && <Skeleton className="h-64 w-full" />}
        {!hayMas && !cargando && lista.length > POR_PAGINA && (
          <p className="text-center text-xs text-muted-foreground">
            Ya viste todo lo que hay por aquí.
          </p>
        )}
      </div>
    </div>
  )
}

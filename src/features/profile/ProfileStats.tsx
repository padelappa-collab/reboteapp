import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserAvatar } from '@/components/UserAvatar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { seguidoresDe, siguiendoDe, type JugadorBreve } from '@/features/feed/feed.api'
import { supabase } from '@/lib/supabase'

type Lado = 'seguidores' | 'siguiendo'

const VACIO: Record<Lado, string> = {
  seguidores: 'Todavía no te sigue nadie. Publica un partido y comenta: es como te encuentran.',
  siguiendo: 'No sigues a nadie todavía. Búscalos desde el buscador de Social.',
}

/**
 * Los tres números de la cabecera del perfil.
 *
 * Van en una fila corrida, sin tarjeta ni recuadros. Antes eran dos cajas con
 * borde flotando bajo el nombre y se leían como un widget pegado, no como parte
 * del perfil. Una fila de cifras con su etiqueta debajo es lo que hace que se
 * entiendan de un vistazo, y es como lo resuelve cualquier app social.
 *
 * Publicaciones no abre nada: la rejilla está justo debajo.
 */
/** Un número con su etiqueta debajo. Fuera del componente para no remontarlo. */
function Cifra({ n, etiqueta }: { n: number; etiqueta: string }) {
  return (
    <>
      <span className="numero text-lg leading-none">{n}</span>
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
    </>
  )
}

export function ProfileStats({ userId }: { userId: string }) {
  const [seguidores, setSeguidores] = useState<JugadorBreve[] | null>(null)
  const [siguiendo, setSiguiendo] = useState<JugadorBreve[] | null>(null)
  const [publicaciones, setPublicaciones] = useState<number | null>(null)
  const [abierto, setAbierto] = useState<Lado | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        seguidoresDe(userId),
        siguiendoDe(userId),
        supabase
          .from('feed_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])
      setSeguidores(a)
      setSiguiendo(b)
      setPublicaciones(c.count ?? 0)
    } catch (error) {
      console.error('No se pudieron cargar los contadores', error)
      setSeguidores([])
      setSiguiendo([])
      setPublicaciones(0)
    }
  }, [userId])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (seguidores === null || siguiendo === null || publicaciones === null) {
    return <Skeleton className="h-12 w-full" />
  }

  const lista = abierto === 'siguiendo' ? siguiendo : seguidores


  return (
    <Sheet open={abierto !== null} onOpenChange={(o) => !o && setAbierto(null)}>
      <div className="flex items-stretch">
        <div className="flex flex-1 flex-col items-center gap-0.5 py-1">
          <Cifra n={publicaciones} etiqueta="Publicaciones" />
        </div>

        {/* separadores finos, que es todo lo que hace falta para agrupar */}
        <div className="w-px self-center bg-border" style={{ height: '2rem' }} />

        <button
          type="button"
          className="flex flex-1 flex-col items-center gap-0.5 py-1"
          onClick={() => setAbierto('seguidores')}
        >
          <Cifra n={seguidores.length} etiqueta="Seguidores" />
        </button>

        <div className="w-px self-center bg-border" style={{ height: '2rem' }} />

        <button
          type="button"
          className="flex flex-1 flex-col items-center gap-0.5 py-1"
          onClick={() => setAbierto('siguiendo')}
        >
          <Cifra n={siguiendo.length} etiqueta="Siguiendo" />
        </button>
      </div>

      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{abierto === 'siguiendo' ? 'Siguiendo' : 'Seguidores'}</SheetTitle>
          <SheetDescription>
            {lista.length === 1 ? '1 jugador' : `${lista.length} jugadores`}
          </SheetDescription>
        </SheetHeader>

        {lista.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted-foreground">
            {abierto ? VACIO[abierto] : ''}
          </p>
        ) : (
          <div className="divide-y px-4 pb-6">
            {lista.map((u) => (
              <Link
                key={u.id}
                to={`/jugador/${u.id}`}
                className="flex items-center gap-3 py-3"
                onClick={() => setAbierto(null)}
              >
                <UserAvatar
                  id={u.id}
                  nombre={u.nombre}
                  fotoUrl={u.foto_url}
                  className="size-10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {u.username ? `@${u.username}` : u.nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.nombre}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

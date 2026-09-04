import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  seguidoresDe,
  siguiendoDe,
  type JugadorBreve,
} from './feed.api'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

type Lado = 'seguidores' | 'siguiendo'

const TEXTO: Record<Lado, { titulo: string; vacio: string }> = {
  seguidores: {
    titulo: 'Seguidores',
    vacio: 'Todavía no te sigue nadie. Publica un partido y comenta: es como te encuentran.',
  },
  siguiendo: {
    titulo: 'Siguiendo',
    vacio: 'No sigues a nadie todavía. Búscalos desde el buscador de Social.',
  },
}

/**
 * Contadores de seguidores y seguidos, y la lista detrás de cada uno.
 *
 * Los números solos no sirven de mucho: lo que la gente quiere es ver quién
 * está detrás, sobre todo para encontrar contra quién jugar. Por eso cada
 * contador abre la lista y cada nombre lleva a su perfil.
 */
export function FollowsCard({ userId }: { userId: string }) {
  const [seguidores, setSeguidores] = useState<JugadorBreve[] | null>(null)
  const [siguiendo, setSiguiendo] = useState<JugadorBreve[] | null>(null)
  const [abierto, setAbierto] = useState<Lado | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([seguidoresDe(userId), siguiendoDe(userId)])
      setSeguidores(a)
      setSiguiendo(b)
    } catch (error) {
      console.error('No se pudieron cargar los seguidores', error)
      setSeguidores([])
      setSiguiendo([])
    }
  }, [userId])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (seguidores === null || siguiendo === null) {
    return <Skeleton className="h-16 w-full" />
  }

  const lista = abierto === 'siguiendo' ? siguiendo : seguidores

  return (
    <Sheet
      open={abierto !== null}
      onOpenChange={(o) => {
        if (!o) setAbierto(null)
      }}
    >
      <div className="grid grid-cols-2 divide-x rounded-lg border">
        {(['seguidores', 'siguiendo'] as const).map((lado) => (
          <SheetTrigger asChild key={lado}>
            <button
              type="button"
              className="flex flex-col items-center py-3 transition-colors hover:bg-muted/50"
              onClick={() => setAbierto(lado)}
            >
              <span className="text-lg font-semibold">
                {lado === 'seguidores' ? seguidores.length : siguiendo.length}
              </span>
              <span className="text-xs text-muted-foreground">{TEXTO[lado].titulo}</span>
            </button>
          </SheetTrigger>
        ))}
      </div>

      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{abierto ? TEXTO[abierto].titulo : ''}</SheetTitle>
          <SheetDescription>
            {lista.length === 1 ? '1 jugador' : `${lista.length} jugadores`}
          </SheetDescription>
        </SheetHeader>

        {lista.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted-foreground">
            {abierto ? TEXTO[abierto].vacio : ''}
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
                <Avatar className="size-10">
                  {u.foto_url && <AvatarImage src={u.foto_url} alt="" />}
                  <AvatarFallback>{iniciales(u.nombre)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.nombre}</p>
                  {u.username && (
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

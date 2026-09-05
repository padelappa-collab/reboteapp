import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { obtenerPublicacion, type PublicacionConDatos } from './board.api'
import { PostCard, quienesVan } from './PostCard'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Ficha de una publicación: quiénes van y en qué puesto entró cada uno. */
export default function BoardPostPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const [publicacion, setPublicacion] = useState<PublicacionConDatos | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    if (!id) return
    setCargando(true)
    try {
      setPublicacion(await obtenerPublicacion(id))
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    recargar()
  }, [recargar])

  if (cargando) return <Skeleton className="h-96 w-full" />

  if (!publicacion) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Esta publicación ya no existe. Puede que quien la creó se haya salido y no
          quedara nadie más.
        </p>
        <Link to="/tablon" className="text-sm font-medium text-court">
          Volver al tablón
        </Link>
      </div>
    )
  }

  const van = quienesVan(publicacion)
  const libres = Math.max(0, 4 - van.length)

  const papel = (idJugador: string) => {
    if (idJugador === publicacion.user_id) return 'publicó'
    if (publicacion.acompanantes.includes(idJugador)) return 'ya iba'
    return 'se unió'
  }

  return (
    <div className="space-y-4 pb-4">
      <Link
        to="/tablon"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tablón
      </Link>

      <h1 className="text-xl font-semibold">Ficha del partido</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Quiénes van
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {van.length} de 4
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {van.map((j) => (
            <div key={j.id} className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">{iniciales(j.nombre)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {j.nombre}
                {j.id === perfil?.id && (
                  <span className="text-muted-foreground"> (tú)</span>
                )}
              </span>
              <Badge variant="outline" className="text-xs">
                {papel(j.id)}
              </Badge>
            </div>
          ))}

          {Array.from({ length: libres }).map((_, i) => (
            <div key={`libre-${i}`} className="flex items-center gap-3 opacity-60">
              <div className="size-9 rounded-full border border-dashed" />
              <span className="flex-1 text-sm text-muted-foreground">Cupo libre</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <PostCard
        publicacion={publicacion}
        usuarioId={perfil?.id ?? ''}
        onCambio={recargar}
        conEnlace={false}
      />
    </div>
  )
}

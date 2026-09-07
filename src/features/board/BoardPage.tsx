import { Trophy } from 'lucide-react'
import { ClipboardList, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { enRango, ListFilters, type RangoFecha } from '@/components/ListFilters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/useAuth'
import type { PublicacionConDatos } from './board.api'
import { CreatePostSheet } from './CreatePostSheet'
import { PostCard, quienesVan } from './PostCard'
import { useBoard } from './useBoard'

type Pestana = 'abiertas' | 'mias'

/** Estoy metido si publiqué, si ya iba, o si me apunté. */
function esMia(p: PublicacionConDatos, userId: string) {
  return (
    p.user_id === userId ||
    p.acompanantes.includes(userId) ||
    p.apuntados.some((a) => a.id === userId)
  )
}

export default function BoardPage() {
  const { perfil } = useAuth()
  const { publicaciones, cargando, error, recargar } = useBoard(perfil?.ciudad)
  const [pestana, setPestana] = useState<Pestana>('abiertas')
  const [rango, setRango] = useState<RangoFecha>('todas')
  const [fecha, setFecha] = useState('')
  const [cancha, setCancha] = useState('todas')

  // las canchas de la lista, no todas las de la ciudad: ofrecer un filtro que
  // no deja nada es peor que no ofrecerlo
  const canchas = useMemo(() => {
    const porId = new Map<string, string>()
    for (const p of publicaciones) {
      if (p.cancha) porId.set(p.cancha.id, p.cancha.nombre)
    }
    return [...porId].map(([id, nombre]) => ({ id, nombre }))
  }, [publicaciones])

  const filtrada = (lista: PublicacionConDatos[]) =>
    lista.filter(
      (p) =>
        enRango(p.fecha_partido, rango, fecha) &&
        (cancha === 'todas' || p.cancha_id === cancha),
    )

  const filtrando = rango !== 'todas' || cancha !== 'todas'

  const yo = perfil?.id ?? ''
  const hayCupo = (p: PublicacionConDatos) =>
    quienesVan(p).length < 4 && p.estado !== 'cancelado'
  const abiertas = filtrada(publicaciones.filter(hayCupo))
  // aquí sí entran las cerradas: cuando el cupo se llena hay que poder seguir
  // viendo el partido al que entraste, y registrarlo
  const mias = filtrada(publicaciones.filter((p) => esMia(p, yo)))

  const lista = pestana === 'abiertas' ? abiertas : mias

  const vacio = filtrando
    ? 'Nada con esos filtros. Prueba con otra fecha o quítalos.'
    : pestana === 'abiertas'
      ? 'No hay publicaciones abiertas. Publica la primera y que te encuentren.'
      : 'No estás en ninguna publicación. Apúntate a alguna o crea la tuya.'

  return (
    <div className="flex min-h-[calc(100dvh-var(--cabecera)-5rem)] flex-col space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tablón</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" data-tour="torneos">
            <Link to="/torneos">
              <Trophy className="size-4" />
              Torneos
            </Link>
          </Button>
          <CreatePostSheet onCreada={recargar} />
        </div>
      </div>

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
        <TabsList className="w-full" data-tour="tablon-pestanas">
          <TabsTrigger value="abiertas" className="flex-1">
            Abiertas
            {abiertas.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {abiertas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mias" className="flex-1">
            En las que estoy
            {mias.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {mias.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ListFilters
        rango={rango}
        onRango={setRango}
        fecha={fecha}
        onFecha={setFecha}
        cancha={cancha}
        onCancha={setCancha}
        canchas={canchas}
        activo={filtrando}
        onLimpiar={() => {
          setRango('todas')
          setFecha('')
          setCancha('todas')
        }}
      />

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!cargando && lista.length === 0 && (
        <EmptyState
          icono={filtrando ? SearchX : ClipboardList}
          titulo={filtrando ? 'Nada con esos filtros' : 'El tablón está vacío'}
          texto={vacio}
        >
          {!filtrando && <CreatePostSheet onCreada={recargar} />}
        </EmptyState>
      )}

      <div className="space-y-3">
        {lista.map((p) => (
          <PostCard key={p.id} publicacion={p} usuarioId={yo} onCambio={recargar} />
        ))}
      </div>
    </div>
  )
}

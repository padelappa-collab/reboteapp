import { CalendarDays, Plus, Trophy, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { enRango, ListFilters, type RangoFecha } from '@/components/ListFilters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/useAuth'
import { useCourts } from '@/features/courts/useCourts'
import {
  ETIQUETA_ESTADO,
  ETIQUETA_FORMATO,
  limiteDeNivel,
  torneosDe,
  type Torneo,
} from './tournaments.api'

const COLOR_ESTADO: Record<Torneo['estado'], string> = {
  inscripciones: 'bg-primary/10 text-primary',
  en_curso: 'bg-amber-100 text-amber-900',
  finalizado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-muted text-muted-foreground',
}

export default function TournamentsListPage() {
  const { perfil } = useAuth()
  const [torneos, setTorneos] = useState<Torneo[]>([])
  const [cargando, setCargando] = useState(true)
  const { canchas: canchasCiudad } = useCourts(perfil?.ciudad)
  const [rango, setRango] = useState<RangoFecha>('todas')
  const [fecha, setFecha] = useState('')
  const [cancha, setCancha] = useState('todas')
  const [formato, setFormato] = useState('todos')

  const cargar = useCallback(async () => {
    if (!perfil) return
    setCargando(true)
    try {
      setTorneos(await torneosDe(perfil.ciudad))
    } catch (error) {
      console.error('No se pudieron cargar los torneos', error)
    } finally {
      setCargando(false)
    }
  }, [perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  // solo las canchas que algún torneo usa: un filtro que no deja nada estorba
  const canchas = useMemo(() => {
    const usadas = new Set(torneos.map((t) => t.cancha_id).filter(Boolean))
    return canchasCiudad
      .filter((c) => usadas.has(c.id))
      .map((c) => ({ id: c.id, nombre: c.nombre }))
  }, [torneos, canchasCiudad])

  const filtrando = rango !== 'todas' || cancha !== 'todas' || formato !== 'todos'

  const visibles = torneos.filter(
    (t) =>
      enRango(t.fecha_inicio, rango, fecha) &&
      (cancha === 'todas' || t.cancha_id === cancha) &&
      (formato === 'todos' || t.formato === formato),
  )

  const abiertos = visibles.filter(
    (t) => t.estado === 'inscripciones' || t.estado === 'en_curso',
  )
  // los cancelados se quedan a la vista: quien se había inscrito merece ver por
  // qué ya no aparece, en vez de que desaparezca sin más
  const pasados = visibles.filter(
    (t) => t.estado === 'finalizado' || t.estado === 'cancelado',
  )

  function tarjeta(t: Torneo) {
    return (
      <Card key={t.id}>
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/torneos/${t.id}`} className="min-w-0 flex-1">
              <p className="truncate font-medium hover:underline">{t.nombre}</p>
            </Link>
            <Badge variant="outline" className={COLOR_ESTADO[t.estado]}>
              {ETIQUETA_ESTADO[t.estado]}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" />
              {new Date(t.fecha_inicio).toLocaleString('es-CO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="flex items-center gap-2">
              <Trophy className="size-4 shrink-0" />
              {ETIQUETA_FORMATO[t.formato]} · {t.ranking} · {limiteDeNivel(t)}
            </p>
            <p className="flex items-center gap-2">
              <Users className="size-4 shrink-0" />
              Hasta {t.max_parejas} parejas
            </p>
          </div>

          <Button asChild variant="secondary" className="h-10 w-full">
            <Link to={`/torneos/${t.id}`}>Ver torneo</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Torneos</h1>
        <Button asChild size="sm">
          <Link to="/torneos/nuevo">
            <Plus className="size-4" />
            Crear
          </Link>
        </Button>
      </div>

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
          setFormato('todos')
        }}
      >
        <Select value={formato} onValueChange={setFormato}>
          <SelectTrigger className="h-10 flex-1">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los formatos</SelectItem>
            {(['americano', 'cuadrangular', 'grupos'] as const).map((f) => (
              <SelectItem key={f} value={f}>
                {ETIQUETA_FORMATO[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ListFilters>

      {cargando && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!cargando && visibles.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filtrando
              ? 'Ningún torneo con esos filtros. Prueba con otra fecha o quítalos.'
              : `No hay torneos en ${perfil?.ciudad}. Crea el primero: puedes organizar
                 un americano, un cuadrangular o una fase de grupos.`}
          </p>
        </div>
      )}

      <div className="space-y-3">{abiertos.map(tarjeta)}</div>

      {pasados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Terminados y cancelados
          </h2>
          {pasados.map(tarjeta)}
        </section>
      )}
    </div>
  )
}

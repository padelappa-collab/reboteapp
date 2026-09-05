import { useState } from 'react'
import { CategoryBadge } from '@/components/CategoryBadge'
import { MatchCard } from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SetsInput } from '@/features/matches/SetsInput'
import { EloCard } from '@/features/profile/EloCard'
import { RankingRow } from '@/features/ranking/RankingRow'
import type { MatchRow, SetMarcador } from '@/types/database'

/**
 * Vista del sistema de diseño, con datos inventados.
 *
 * Existe para poder mirar el rediseño sin tener que iniciar sesión ni ensuciar
 * datos reales. Son los componentes de verdad, no una maqueta aparte: si algo
 * se ve bien aquí, se ve igual en la app.
 *
 * Es temporal. Se borra junto con su ruta cuando el rediseño esté aprobado.
 */

const JUGADORES = [
  { id: '1', nombre: 'Felipe Nule', elo: 1842, peak: 1901 },
  { id: '2', nombre: 'Sergio Martínez', elo: 1615, peak: 1615 },
  { id: '3', nombre: 'Andrés Vergara', elo: 1489, peak: 1560 },
  { id: '4', nombre: 'Camilo Restrepo', elo: 1204, peak: 1204 },
  { id: '5', nombre: 'Juan Pablo Díaz', elo: 987, peak: 1050 },
]

const NOMBRES = new Map(JUGADORES.map((j) => [j.id, j.nombre]))

function partido(over: Partial<MatchRow>): MatchRow {
  return {
    id: 'p1',
    fecha: new Date().toISOString(),
    cancha_id: null,
    creado_por: '1',
    pareja_a: ['1', '2'],
    pareja_b: ['3', '4'],
    sets: [
      { a: 6, b: 4 },
      { a: 7, b: 5 },
    ],
    ganador: 'a',
    match_type: 'masculino',
    resultado_confirmado_por: ['1', '2'],
    estado: 'pendiente',
    cancelado_por: null,
    tournament_id: null,
    created_at: '',
    updated_at: '',
    confirmado_at: null,
    ...over,
  } as MatchRow
}

function Seccion({ titulo, nota, children }: {
  titulo: string
  nota: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-xs text-muted-foreground">{nota}</p>
      </div>
      {children}
    </section>
  )
}

export default function DesignPreviewPage() {
  const [sets, setSets] = useState<SetMarcador[]>([
    { a: 6, b: 4 },
    { a: 3, b: 6 },
    { a: 7, b: 5 },
  ])

  return (
    <div className="mx-auto max-w-md space-y-8 p-4 pb-16">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Sistema de diseño</h1>
        <p className="text-sm text-muted-foreground">
          Componentes reales con datos inventados. Fondo cálido, tarjetas blancas
          con sombra y sin borde, radio de 10 px en todo, e Inter para leer con
          Space Grotesk solo en los números que representan un nivel o un
          resultado.
        </p>
      </header>

      <Seccion
        titulo="Ranking"
        nota="El ELO pesa más que el nombre. El neón aparece una sola vez: tu propia fila."
      >
        <ol className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-sm">
          {JUGADORES.map((j, i) => (
            <RankingRow
              key={j.id}
              id={j.id}
              puesto={i + 1}
              nombre={j.nombre}
              elo={j.elo}
              peakElo={j.peak}
              ranking="masculino"
              soyYo={i === 2}
            />
          ))}
        </ol>
      </Seccion>

      <Seccion
        titulo="Perfil · los tres ELO"
        nota="El número como protagonista de cada tarjeta, con la barra hacia la siguiente categoría en neón."
      >
        <div className="space-y-3">
          <EloCard ranking="masculino" elo={1489} peakElo={1560} />
          <EloCard ranking="mixto" elo={1205} peakElo={1205} />
        </div>
      </Seccion>

      <Seccion
        titulo="Partidos"
        nota="El marcador se lee antes que los nombres al recorrer la lista."
      >
        <div className="space-y-3">
          <MatchCard partido={partido({})} nombres={NOMBRES} usuarioId="1" />
          <MatchCard
            partido={partido({
              id: 'p2',
              estado: 'confirmado',
              ganador: 'b',
              sets: [
                { a: 4, b: 6 },
                { a: 2, b: 6 },
              ],
              resultado_confirmado_por: ['1', '2', '3', '4'],
            })}
            nombres={NOMBRES}
            usuarioId="1"
          />
        </div>
      </Seccion>

      <Seccion
        titulo="Registrar partido · marcador"
        nota="Los juegos, en la tipografía de los números. Un solo botón en neón por pantalla."
      >
        <Card>
          <CardContent className="space-y-5">
            <SetsInput
              sets={sets}
              onChange={setSets}
              etiquetaA="Tú y Sergio"
              etiquetaB="Andrés y Camilo"
            />
            <Button className="h-11 w-full">Guardar partido</Button>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion titulo="Piezas sueltas" nota="Categorías, botones y estados.">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <CategoryBadge elo={2850} ranking="masculino" peakElo={2850} />
              <CategoryBadge elo={1489} ranking="masculino" peakElo={1560} />
              <CategoryBadge elo={720} ranking="femenino" peakElo={800} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button>Acción principal</Button>
              <Button variant="outline">Secundaria</Button>
              <Button variant="ghost">Terciaria</Button>
              <Button variant="destructive">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      </Seccion>
    </div>
  )
}

import { useState } from 'react'
import { CategoryBadge } from '@/components/CategoryBadge'
import { MatchCard } from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SetsInput } from '@/features/matches/SetsInput'
import { EloCard } from '@/features/profile/EloCard'
import { FeedPostCard } from '@/features/feed/FeedPostCard'
import { BadgeGlyph } from '@/features/badges/BadgeGlyph'
import { RankingRow } from '@/features/ranking/RankingRow'
import { StoryViewer } from '@/features/stories/StoryViewer'
import type { MatchRow, SetMarcador } from '@/types/database'
import type { Publicacion } from '@/features/feed/feed.api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Vista del sistema de diseño, con datos inventados.
 *
 * Existe para poder mirar el rediseño sin tener que iniciar sesión ni ensuciar
 * datos reales. Son los componentes de verdad, no una maqueta aparte: si algo
 * se ve bien aquí, se ve igual en la app.
 *
 * Es temporal. Se borra junto con su ruta cuando el rediseño esté aprobado.
 */

const TODAS_LAS_INSIGNIAS: Array<[string, string]> = [
  ['primer_partido', '#3E9B80'], ['10_partidos', '#3E9B80'], ['50_partidos', '#3E9B80'],
  ['100_partidos', '#3E9B80'], ['primer_torneo', '#3E9B80'],
  ['racha_3', '#DE7A52'], ['racha_5', '#DE7A52'], ['racha_10', '#DE7A52'],
  ['cazador', '#DE7A52'], ['invicto_torneo', '#DE7A52'],
  ['maraton_semanal', '#DE7A52'], ['mes_intenso', '#DE7A52'],
  ['subio_categoria_masc', '#C9A03A'], ['subio_categoria_fem', '#C9A03A'],
  ['subio_categoria_mixto', '#C9A03A'], ['top_10_masc', '#C9A03A'],
  ['top_10_fem', '#C9A03A'], ['top_10_mixto', '#C9A03A'],
  ['numero_1_categoria', '#C9A03A'],
  ['primer_post', '#5490B8'], ['conecta_4', '#5490B8'], ['casamentero', '#5490B8'],
  ['racha_semanal', '#5490B8'], ['comentarista', '#5490B8'], ['anfitrion', '#5490B8'],
  ['tablon_activo', '#5490B8'],
  ['todoterreno', '#8B7BC0'], ['fundador', '#8B7BC0'], ['veterano', '#8B7BC0'],
  ['rey_de_la_cancha', '#8B7BC0'],
]

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

/** Una foto de mentira, para no meter fotografías en la interfaz. */
function lienzo(a: string, b: string, texto: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${a}"/>
    <circle cx="300" cy="110" r="120" fill="${b}" opacity="0.5"/>
    <circle cx="110" cy="300" r="90" fill="${b}" opacity="0.35"/>
    <text x="200" y="210" font-family="sans-serif" font-size="26" fill="#ffffff"
      text-anchor="middle" opacity="0.85">${texto}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const HISTORIAS = [
  { id: 'h1', imagen_url: lienzo('#1D4D3E', '#E8FF3D', 'Cancha 3, 7pm'), created_at: new Date(Date.now() - 3600e3).toISOString(), visto: false },
  { id: 'h2', imagen_url: lienzo('#131A14', '#E8FF3D', 'Falta uno'), created_at: new Date(Date.now() - 1800e3).toISOString(), visto: false },
  { id: 'h3', imagen_url: lienzo('#3B2E1D', '#E8FF3D', 'Ganamos 6-4 7-5'), created_at: new Date(Date.now() - 600e3).toISOString(), visto: false },
]

const AUTORES_HISTORIA = [
  { user_id: '2', nombre: 'Sergio Martínez', username: 'sergiom', foto_url: null, total: 3, sin_ver: 3, ultima: new Date().toISOString(), soy_yo: false },
]

function publicacion(over: Partial<Publicacion>): Publicacion {
  return {
    id: 'f1',
    user_id: '2',
    contenido: 'Partidazo en Bocagrande. Tercer set a muerte 🎾',
    match_id: null,
    imagen_url: lienzo('#1D4D3E', '#E8FF3D', 'Foto del partido'),
    created_at: new Date(Date.now() - 7200e3).toISOString(),
    autor: { id: '2', nombre: 'Sergio Martínez', foto_url: null, cuenta_privada: false },
    partido: null,
    meGusta: 13,
    yaDiMeGusta: false,
    comentarios: 4,
    unoQueDioMeGusta: 'felipenule',
    ...over,
  } as Publicacion
}

/** La barra de historias, sin sesión: solo para mirar los anillos. */
function BarraMuestra({ onAbrir }: { onAbrir: () => void }) {
  const gente = [
    { n: 'Tu historia', sinVer: false, propia: true },
    { n: 'sergiom', sinVer: true, propia: false },
    { n: 'andresv', sinVer: true, propia: false },
    { n: 'camilor', sinVer: false, propia: false },
    { n: 'jpdiaz', sinVer: false, propia: false },
  ]
  return (
    <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 py-1">
      {gente.map((g) => (
        <button
          key={g.n}
          type="button"
          className="flex w-16 shrink-0 flex-col items-center gap-1"
          onClick={onAbrir}
        >
          <span className="relative">
            <Avatar
              className={cn(
                'size-16 ring-2 ring-offset-2',
                g.sinVer ? 'ring-anillo' : 'ring-border',
              )}
            >
              <AvatarFallback>{g.n.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {g.propia && (
              <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                <Plus className="size-3" />
              </span>
            )}
          </span>
          <span
            className={cn(
              'w-full truncate text-center text-xs',
              g.sinVer ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {g.n}
          </span>
        </button>
      ))}
    </div>
  )
}

/** La bandeja, con datos inventados: los componentes reales piden sesión. */
function BandejaMuestra() {
  const filas = [
    { n: 'sergiom', real: 'Sergio Martínez', txt: 'Listo, nos vemos a las 7', t: '5 min', sin: 2 },
    { n: 'andresv', real: 'Andrés Vergara', txt: 'Una publicación', t: '2 h', sin: 1 },
    { n: 'camilor', real: 'Camilo Restrepo', txt: 'Tú: dale, yo llevo las bolas', t: 'ayer', sin: 0 },
  ]
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-sm">
      {filas.map((f) => (
        <li key={f.n} className="flex items-center gap-3 p-3">
          <Avatar className="size-11">
            <AvatarFallback className="text-xs">{f.real.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.n}</p>
            <p
              className={cn(
                'truncate text-sm',
                f.sin > 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {f.txt}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">{f.t}</span>
            {f.sin > 0 && (
              <span className="numero flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {f.sin}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Una conversación: burbujas, publicación compartida y campo de envío. */
function ChatMuestra() {
  const burbujas = [
    { mio: false, txt: '¿Jugamos el sábado?', h: '18:02' },
    { mio: true, txt: 'De una. ¿A qué hora?', h: '18:03' },
    { mio: false, txt: '7 de la noche en Bocagrande', h: '18:03' },
    { mio: true, post: true, h: '18:05' },
    { mio: false, txt: 'Jajaja qué partidazo ese', h: '18:07' },
  ]
  return (
    <Card>
      <CardContent className="space-y-2">
        {burbujas.map((b, i) => (
          <div key={i} className={cn('flex', b.mio ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[78%] space-y-1 rounded-[var(--radius)] px-3 py-2',
                b.mio ? 'bg-primary/20' : 'bg-muted',
              )}
            >
              {b.post && (
                <div className="w-56 max-w-full overflow-hidden rounded-[var(--radius)] bg-background/80">
                  <img
                    src={lienzo('#1D4D3E', '#E8FF3D', '')}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[9px]">SM</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs font-medium">Sergio Martínez</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs opacity-70">
                      Partidazo en Bocagrande. Tercer set a muerte
                    </p>
                  </div>
                </div>
              )}
              {b.txt && <p className="text-sm">{b.txt}</p>}
              <p className="text-right text-[10px] text-muted-foreground">{b.h}</p>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <div className="h-11 flex-1 rounded-[var(--radius)] border px-3 text-sm leading-[2.75rem] text-muted-foreground">
            Escribe un mensaje
          </div>
          <Button size="icon" className="size-11 shrink-0" aria-label="Enviar">
            <Send className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
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
  const [visor, setVisor] = useState(false)
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
        titulo="Historias"
        nota="Anillo de un solo tono: gris oscuro si queda algo por ver, gris claro si ya lo viste. Toca cualquiera para abrir el visor."
      >
        <BarraMuestra onAbrir={() => setVisor(true)} />
      </Seccion>

      <Seccion
        titulo="Mensajes · bandeja"
        nota="El no leído se lee más oscuro y lleva el contador en neón. Es el único acento de la pantalla."
      >
        <BandejaMuestra />
      </Seccion>

      <Seccion
        titulo="Mensajes · conversación"
        nota="Lo tuyo a la derecha en neón diluido, lo del otro a la izquierda en gris. Una publicación compartida llega como tarjeta, no como copia."
      >
        <ChatMuestra />
      </Seccion>

      <Seccion
        titulo="Feed"
        nota="Doble toque en la foto para el corazón en neón. El corazón de abajo refleja el mismo estado."
      >
        <FeedPostCard
          publicacion={publicacion({})}
          usuarioId="1"
          onCambio={() => {}}
        />
      </Seccion>

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

      <Seccion
        titulo="Las 30 insignias"
        nota="Un color por familia: participación, racha, progresión, social y especial. En gris, las que faltan."
      >
        <div className="grid grid-cols-5 gap-2">
          {TODAS_LAS_INSIGNIAS.map(([id, color], i) => (
            <div
              key={id}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-[var(--radius)] p-2 text-center',
                i % 4 === 3 && 'bg-elevated text-muted-foreground',
              )}
              style={i % 4 !== 3 ? { color, backgroundColor: `${color}26` } : undefined}
            >
              <BadgeGlyph id={id} />
              <span className="text-[9px] leading-tight">{id}</span>
            </div>
          ))}
        </div>
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

      {visor && (
        <StoryViewer
          autores={AUTORES_HISTORIA}
          indiceInicial={0}
          historiasFijas={HISTORIAS}
          onCerrar={() => setVisor(false)}
        />
      )}
    </div>
  )
}

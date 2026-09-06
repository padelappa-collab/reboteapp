import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Maximize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CourtRow } from '@/types/database'

type CanchaUbicada = CourtRow & { lat: number; lng: number }

/**
 * Mapa de imágenes (raster) con Leaflet sobre las teselas de Esri.
 *
 * La elección de raster es a propósito: los mapas vectoriales se ven mejor pero
 * exigen WebGL2, y en las pruebas del piloto hubo un dispositivo donde no
 * dibujaban nada. Un mapa de imágenes funciona en cualquier navegador. Las
 * teselas de Esri son gratuitas, no piden API key y no ponen marca de agua.
 *
 * Dos vistas, como en cualquier mapa conocido: satélite (se ven las canchas
 * desde arriba, que para elegir club dice más que un plano) y un mapa limpio.
 * En ambas va encima una capa de nombres de calles y barrios.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'

const VISTAS = {
  satelite: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  mapa: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
} as const

const ETIQUETAS = `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`

type Vista = keyof typeof VISTAS

/*
 * Los colores del mapa salen de la paleta de marca, no de un verde suelto.
 *
 * La cancha seleccionada va en neón y el resto en verde cancha. Es uno de los
 * pocos sitios donde el neón se gana su sitio: sobre una foto de satélite —con
 * tejados, agua y vegetación— cualquier verde oscuro se pierde, y lo que se
 * busca es justo que salte a la vista cuál estás mirando.
 *
 * Van como texto y no como clases de Tailwind porque Leaflet monta el pin
 * inyectando HTML, fuera del árbol de React.
 */
const NEON = '#E8FF3D'
const CANCHA = '#1D4D3E'
const TINTA = '#131A14'

/** Pin de gota con una pelota de pádel dentro, dibujado en SVG. */
function pin(activo: boolean, nombre: string) {
  const alto = activo ? 50 : 40
  const ancho = Math.round(alto * 0.72)
  const relleno = activo ? NEON : CANCHA
  // el detalle de la pelota tiene que contrastar con su propio relleno
  const detalle = activo ? CANCHA : '#FFFFFF'
  const borde = activo ? CANCHA : '#FFFFFF'

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <svg width="${ancho}" height="${alto}" viewBox="0 0 24 34" fill="none">
          <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z"
                fill="${relleno}" stroke="${borde}" stroke-width="1.6"/>
          <circle cx="12" cy="11.6" r="5.4" fill="${detalle}"/>
          <path d="M12 6.2c1.5 1.5 1.5 9.3 0 10.8M6.6 11.6c1.9-1.4 8.9-1.4 10.8 0"
                stroke="${relleno}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        </svg>
        <span style="
          margin-top:-4px;white-space:nowrap;background:white;color:${TINTA};
          border:1px solid #E5E5E0;border-radius:10px;padding:2px 7px;
          font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.2);
        ">${nombre}</span>
      </div>`,
    iconSize: [ancho, alto + 16],
    iconAnchor: [ancho / 2, alto],
  })
}

function limitesDe(canchas: CanchaUbicada[]) {
  return L.latLngBounds(canchas.map((c) => [c.lat, c.lng] as [number, number]))
}

function Encuadre({
  canchas,
  seleccionada,
}: {
  canchas: CanchaUbicada[]
  seleccionada: string | null
}) {
  const mapa = useMap()

  useEffect(() => {
    const activa = canchas.find((c) => c.id === seleccionada)
    if (activa) {
      mapa.flyTo([activa.lat, activa.lng], 15, { duration: 0.7 })
      return
    }
    if (canchas.length === 1) {
      mapa.setView([canchas[0].lat, canchas[0].lng], 14)
      return
    }
    mapa.fitBounds(limitesDe(canchas), { padding: [45, 55], maxZoom: 14 })
  }, [canchas, seleccionada, mapa])

  return null
}

function Controles({ canchas }: { canchas: CanchaUbicada[] }) {
  const mapa = useMap()
  const [buscando, setBuscando] = useState(false)

  function ubicar() {
    if (!navigator.geolocation) return
    setBuscando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapa.flyTo([coords.latitude, coords.longitude], 14, { duration: 0.7 })
        setBuscando(false)
      },
      () => setBuscando(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute right-3 top-3 z-[1000] h-9 shadow-md"
        onClick={() =>
          mapa.fitBounds(limitesDe(canchas), { padding: [45, 55], maxZoom: 14 })
        }
      >
        <Maximize2 className="size-4" />
        Ver todas
      </Button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label="Centrar en mi ubicación"
        className="absolute bottom-3 right-3 z-[1000] size-10 rounded-full shadow-md"
        disabled={buscando}
        onClick={ubicar}
      >
        <LocateFixed className="size-4" />
      </Button>
    </>
  )
}

export function CourtMap({
  canchas,
  seleccionada,
  onSeleccionar,
}: {
  canchas: CourtRow[]
  seleccionada: string | null
  onSeleccionar: (id: string) => void
}) {
  const [vista, setVista] = useState<Vista>('satelite')

  const ubicadas = canchas.filter(
    (c): c is CanchaUbicada => c.lat !== null && c.lng !== null,
  )

  if (ubicadas.length === 0) return null

  const sinUbicar = canchas.length - ubicadas.length

  return (
    <div className="space-y-1.5">
      <div className="relative h-[55vh] min-h-72 overflow-hidden rounded-xl border shadow-sm">
        {/* selector de vista, como el de cualquier mapa conocido */}
        <div className="absolute left-3 top-3 z-[1000] flex overflow-hidden rounded-lg border bg-background shadow-md">
          {(
            [
              ['satelite', 'Satélite'],
              ['mapa', 'Mapa'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setVista(valor)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                vista === valor
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
              )}
            >
              {texto}
            </button>
          ))}
        </div>

        <MapContainer
          center={[ubicadas[0].lat, ubicadas[0].lng]}
          zoom={12}
          scrollWheelZoom
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            key={vista}
            attribution="&copy; Esri, Maxar, Earthstar Geographics"
            url={VISTAS[vista]}
            maxZoom={19}
          />
          {/* nombres de calles y barrios, encima de la vista elegida */}
          <TileLayer url={ETIQUETAS} maxZoom={19} zIndex={5} />

          <ZoomControl position="bottomleft" />
          <Encuadre canchas={ubicadas} seleccionada={seleccionada} />
          <Controles canchas={ubicadas} />

          {ubicadas.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lng]}
              icon={pin(c.id === seleccionada, c.nombre)}
              zIndexOffset={c.id === seleccionada ? 1000 : 0}
              eventHandlers={{ click: () => onSeleccionar(c.id) }}
            />
          ))}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Toca un pin para ver el club abajo.
        {sinUbicar > 0 &&
          ` ${sinUbicar} ${sinUbicar === 1 ? 'club no tiene' : 'clubes no tienen'} ubicación todavía.`}
      </p>
    </div>
  )
}

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Maximize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import type { CourtRow } from '@/types/database'

type CanchaUbicada = CourtRow & { lat: number; lng: number }

/**
 * Mapa de imágenes (raster) con Leaflet sobre las teselas de Esri.
 *
 * La elección es a propósito: los mapas vectoriales se ven mejor, pero exigen
 * WebGL2 y en las pruebas del piloto hubo dispositivos donde no dibujaban nada.
 * Un mapa de imágenes funciona en cualquier navegador. Las teselas de Esri son
 * gratuitas, no piden API key y no ponen marca de agua encima.
 */
const TESELAS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'

const VERDE = '#1f7a53'
const VERDE_CLARO = '#2f9a6b'

/** Pin de gota con una pelota de pádel dentro, dibujado en SVG. */
function pin(activo: boolean, nombre: string) {
  const alto = activo ? 50 : 40
  const ancho = Math.round(alto * 0.72)
  const relleno = activo ? VERDE : VERDE_CLARO

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <svg width="${ancho}" height="${alto}" viewBox="0 0 24 34" fill="none">
          <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z"
                fill="${relleno}" stroke="white" stroke-width="1.6"/>
          <circle cx="12" cy="11.6" r="5.4" fill="white"/>
          <path d="M12 6.2c1.5 1.5 1.5 9.3 0 10.8M6.6 11.6c1.9-1.4 8.9-1.4 10.8 0"
                stroke="${relleno}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        </svg>
        <span style="
          margin-top:-4px;white-space:nowrap;background:white;color:#111;
          border:1px solid rgba(0,0,0,.12);border-radius:6px;padding:1px 6px;
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
  const ubicadas = canchas.filter(
    (c): c is CanchaUbicada => c.lat !== null && c.lng !== null,
  )

  if (ubicadas.length === 0) return null

  const sinUbicar = canchas.length - ubicadas.length

  return (
    <div className="space-y-1.5">
      <div className="relative h-[55vh] min-h-72 overflow-hidden rounded-xl border shadow-sm">
        <MapContainer
          center={[ubicadas[0].lat, ubicadas[0].lng]}
          zoom={12}
          scrollWheelZoom
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; Esri, HERE, Garmin, OpenStreetMap"
            url={TESELAS}
            maxZoom={19}
          />

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

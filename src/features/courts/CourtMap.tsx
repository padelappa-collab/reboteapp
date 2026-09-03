import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Maximize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import type { CourtRow } from '@/types/database'

type CanchaUbicada = CourtRow & { lat: number; lng: number }

const VERDE = '#1f7a53'

/**
 * Pin en forma de gota con una pelota de pádel dentro, al estilo de los mapas
 * de siempre. Se dibuja en SVG para que se vea nítido en cualquier pantalla y
 * no dependa de las imágenes que Leaflet trae por defecto.
 */
function pin(activo: boolean, etiqueta: string) {
  const alto = activo ? 52 : 40
  const ancho = Math.round(alto * 0.72)
  const relleno = activo ? VERDE : '#2f9a6b'

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center">
        <svg width="${ancho}" height="${alto}" viewBox="0 0 24 34" fill="none">
          <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z"
                fill="${relleno}" stroke="white" stroke-width="1.6"/>
          <circle cx="12" cy="11.6" r="5.4" fill="white"/>
          <path d="M12 6.2c1.5 1.5 1.5 9.3 0 10.8M6.6 11.6c1.9-1.4 8.9-1.4 10.8 0"
                stroke="${relleno}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        </svg>
        ${
          activo
            ? `<span style="
                 position:absolute;top:${alto + 2}px;white-space:nowrap;
                 background:white;color:#111;border:1px solid rgba(0,0,0,.12);
                 border-radius:6px;padding:2px 6px;font-size:11px;font-weight:600;
                 box-shadow:0 1px 4px rgba(0,0,0,.18);
               ">${etiqueta}</span>`
            : ''
        }
      </div>`,
    iconSize: [ancho, alto],
    iconAnchor: [ancho / 2, alto],
  })
}

/** Encuadra todas las canchas, o vuela hasta la que el jugador seleccionó. */
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
    mapa.fitBounds(L.latLngBounds(canchas.map((c) => [c.lat, c.lng] as [number, number])), {
      padding: [45, 45],
      maxZoom: 14,
    })
  }, [canchas, seleccionada, mapa])

  return null
}

/** Centra el mapa en dónde está el jugador, para ver qué club le queda cerca. */
function BotonMiUbicacion() {
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
  )
}

/** Botón para volver a ver todas las canchas después de acercarse a una. */
function BotonVerTodas({ canchas }: { canchas: CanchaUbicada[] }) {
  const mapa = useMap()

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="absolute right-3 top-3 z-[1000] h-9 shadow-md"
      onClick={() =>
        mapa.fitBounds(
          L.latLngBounds(canchas.map((c) => [c.lat, c.lng] as [number, number])),
          { padding: [45, 45], maxZoom: 14 },
        )
      }
    >
      <Maximize2 className="size-4" />
      Ver todas
    </Button>
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
      <div className="relative h-[60vh] min-h-80 overflow-hidden rounded-xl border shadow-sm">
        <MapContainer
          center={[ubicadas[0].lat, ubicadas[0].lng]}
          zoom={12}
          scrollWheelZoom
          zoomControl={false}
          attributionControl
          style={{ height: '100%', width: '100%' }}
        >
          {/*
            Teselas de CARTO Voyager en vez de las estándar de OpenStreetMap:
            se ven mucho más cerca de un mapa moderno y, sobre todo, tienen
            versión @2x, que es lo que las hacía verse borrosas en el celular.
          */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            detectRetina
          />

          <Encuadre canchas={ubicadas} seleccionada={seleccionada} />
          <BotonVerTodas canchas={ubicadas} />
          <BotonMiUbicacion />

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

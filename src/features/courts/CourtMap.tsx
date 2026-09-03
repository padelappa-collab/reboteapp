import L from 'leaflet'
import icono2x from 'leaflet/dist/images/marker-icon-2x.png'
import iconoUrl from 'leaflet/dist/images/marker-icon.png'
import iconoSombra from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { CourtRow } from '@/types/database'

// Leaflet arma las rutas de sus iconos a mano y con un bundler quedan rotas.
// Hay que apuntarlas a los archivos que Vite sí procesa.
L.Icon.Default.mergeOptions({
  iconUrl: iconoUrl,
  iconRetinaUrl: icono2x,
  shadowUrl: iconoSombra,
})

type CanchaUbicada = CourtRow & { lat: number; lng: number }

/** Marcador más grande y con el color de la app para la cancha seleccionada. */
const ICONO_ACTIVO = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;
    background:oklch(0.58 0.15 155);border:3px solid white;
    box-shadow:0 0 0 2px oklch(0.58 0.15 155), 0 2px 6px rgba(0,0,0,.4);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

/**
 * Encuadra el mapa para que se vean todas las canchas, o centra en una cuando
 * el jugador la selecciona desde la lista.
 */
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
      mapa.flyTo([activa.lat, activa.lng], 16, { duration: 0.6 })
      return
    }
    if (canchas.length === 1) {
      mapa.setView([canchas[0].lat, canchas[0].lng], 14)
      return
    }
    if (canchas.length > 1) {
      mapa.fitBounds(
        L.latLngBounds(canchas.map((c) => [c.lat, c.lng] as [number, number])),
        { padding: [40, 40], maxZoom: 15 },
      )
    }
  }, [canchas, seleccionada, mapa])

  return null
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
      <div className="h-80 overflow-hidden rounded-xl border shadow-sm sm:h-96">
        <MapContainer
          center={[ubicadas[0].lat, ubicadas[0].lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Encuadre canchas={ubicadas} seleccionada={seleccionada} />

          {ubicadas.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lng]}
              icon={c.id === seleccionada ? ICONO_ACTIVO : new L.Icon.Default()}
              eventHandlers={{ click: () => onSeleccionar(c.id) }}
            >
              <Popup>
                <span className="text-sm font-medium">{c.nombre}</span>
                {c.direccion && (
                  <>
                    <br />
                    <span className="text-xs">{c.direccion}</span>
                  </>
                )}
                {c.cantidad_canchas !== null && (
                  <>
                    <br />
                    <span className="text-xs">
                      {c.cantidad_canchas}{' '}
                      {c.cantidad_canchas === 1 ? 'cancha' : 'canchas'}
                    </span>
                  </>
                )}
                {c.booking_url && (
                  <>
                    <br />
                    <a href={c.booking_url} target="_blank" rel="noreferrer noopener">
                      Reservar
                    </a>
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Toca un punto para ver el club. Pellizca para acercar.
        {sinUbicar > 0 &&
          ` ${sinUbicar} ${sinUbicar === 1 ? 'club no tiene' : 'clubes no tienen'} ubicación todavía.`}
      </p>
    </div>
  )
}

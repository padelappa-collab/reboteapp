import L from 'leaflet'
import iconoSombra from 'leaflet/dist/images/marker-shadow.png'
import iconoUrl from 'leaflet/dist/images/marker-icon.png'
import icono2x from 'leaflet/dist/images/marker-icon-2x.png'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { CourtRow } from '@/types/database'

// Leaflet resuelve las rutas de sus iconos a mano y con un bundler quedan rotas.
// Hay que apuntarlas a los archivos que Vite sí procesa.
L.Icon.Default.mergeOptions({
  iconUrl: iconoUrl,
  iconRetinaUrl: icono2x,
  shadowUrl: iconoSombra,
})

/** Centro de Cartagena, por si ninguna cancha tiene coordenadas. */
const CARTAGENA: [number, number] = [10.4, -75.53]

export function CourtMap({ canchas }: { canchas: CourtRow[] }) {
  const ubicadas = canchas.filter(
    (c): c is CourtRow & { lat: number; lng: number } => c.lat !== null && c.lng !== null,
  )

  if (ubicadas.length === 0) return null

  const centro: [number, number] =
    ubicadas.length === 1 ? [ubicadas[0].lat, ubicadas[0].lng] : CARTAGENA

  return (
    <div className="h-56 overflow-hidden rounded-lg border">
      <MapContainer
        center={centro}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ubicadas.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lng]}>
            <Popup>
              <strong>{c.nombre}</strong>
              {c.direccion && (
                <>
                  <br />
                  {c.direccion}
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

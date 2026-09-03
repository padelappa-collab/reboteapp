import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Maximize2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CourtRow } from '@/types/database'

type CanchaUbicada = CourtRow & { lat: number; lng: number }

/**
 * Mapa vectorial con MapLibre sobre OpenFreeMap.
 *
 * Es vectorial y no de imágenes: el mapa se dibuja en el dispositivo, así que
 * se ve nítido en cualquier zoom y en cualquier pantalla. OpenFreeMap es libre
 * y no pide API key ni marca el mapa con una marca de agua.
 */
const ESTILO = 'https://tiles.openfreemap.org/styles/liberty'

const VERDE = '#1f7a53'
const VERDE_CLARO = '#2f9a6b'

/** Pin de gota con una pelota de pádel dentro. */
function crearPin(nombre: string, onClick: () => void) {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', nombre)
  el.style.cssText =
    'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer'

  el.innerHTML = `
    <svg width="30" height="42" viewBox="0 0 24 34" fill="none" style="transition:transform .15s">
      <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z"
            fill="${VERDE_CLARO}" stroke="white" stroke-width="1.6"/>
      <circle cx="12" cy="11.6" r="5.4" fill="white"/>
      <path d="M12 6.2c1.5 1.5 1.5 9.3 0 10.8M6.6 11.6c1.9-1.4 8.9-1.4 10.8 0"
            stroke="${VERDE_CLARO}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    </svg>
    <span style="
      margin-top:-2px;white-space:nowrap;background:white;color:#111;
      border:1px solid rgba(0,0,0,.12);border-radius:6px;padding:1px 6px;
      font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.2);
      font-family:system-ui,sans-serif;
    ">${nombre}</span>`

  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return el
}

function pintarActivo(el: HTMLElement, activo: boolean) {
  const svg = el.querySelector('svg')
  const relleno = activo ? VERDE : VERDE_CLARO
  svg?.querySelectorAll('path').forEach((p, i) => {
    if (i === 0) p.setAttribute('fill', relleno)
    else p.setAttribute('stroke', relleno)
  })
  if (svg) svg.style.transform = activo ? 'scale(1.25)' : 'scale(1)'
  el.style.zIndex = activo ? '10' : '1'
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
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  const marcadores = useRef<Record<string, maplibregl.Marker>>({})
  const [fallo, setFallo] = useState<string | null>(null)

  const ubicadas = canchas.filter(
    (c): c is CanchaUbicada => c.lat !== null && c.lng !== null,
  )

  useEffect(() => {
    if (!contenedor.current || mapa.current || ubicadas.length === 0) return

    // MapLibre 6 necesita WebGL2. Es raro que falte, pero si falta hay que
    // decirlo en vez de dejar un recuadro vacío sin explicación.
    const lienzo = document.createElement('canvas')
    if (!lienzo.getContext('webgl2')) {
      setFallo('Este navegador no puede dibujar el mapa.')
      return
    }

    let m: maplibregl.Map
    try {
      m = new maplibregl.Map({
        container: contenedor.current,
        style: ESTILO,
        center: [ubicadas[0].lng, ubicadas[0].lat],
        zoom: 11,
        attributionControl: { compact: true },
      })
    } catch (error) {
      console.error('No se pudo iniciar el mapa', error)
      setFallo('No se pudo cargar el mapa.')
      return
    }

    m.on('error', (e) => console.error('Error del mapa', e.error))

    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'bottom-right',
    )

    for (const c of ubicadas) {
      const el = crearPin(c.nombre, () => onSeleccionar(c.id))
      marcadores.current[c.id] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([c.lng, c.lat])
        .addTo(m)
    }

    m.on('load', () => {
      const limites = new maplibregl.LngLatBounds()
      ubicadas.forEach((c) => limites.extend([c.lng, c.lat]))
      m.fitBounds(limites, { padding: 60, maxZoom: 14, duration: 0 })
    })

    mapa.current = m

    return () => {
      m.remove()
      mapa.current = null
      marcadores.current = {}
    }
    // el mapa se arma una vez; los cambios de selección van en el otro efecto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicadas.length])

  useEffect(() => {
    for (const [id, marcador] of Object.entries(marcadores.current)) {
      pintarActivo(marcador.getElement(), id === seleccionada)
    }

    const activa = ubicadas.find((c) => c.id === seleccionada)
    if (activa && mapa.current) {
      mapa.current.flyTo({ center: [activa.lng, activa.lat], zoom: 15, duration: 700 })
    }
  }, [seleccionada, ubicadas])

  function verTodas() {
    if (!mapa.current) return
    const limites = new maplibregl.LngLatBounds()
    ubicadas.forEach((c) => limites.extend([c.lng, c.lat]))
    mapa.current.fitBounds(limites, { padding: 60, maxZoom: 14, duration: 700 })
  }

  if (ubicadas.length === 0) return null

  const sinUbicar = canchas.length - ubicadas.length

  // Sin mapa, el directorio sigue sirviendo: cada ficha lleva su enlace de
  // "Cómo llegar", que abre la app de mapas del teléfono.
  if (fallo) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-dashed p-4">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-sm text-muted-foreground">
          {fallo} Usa el botón <span className="font-medium">Cómo llegar</span> de cada
          club para abrirlo en tu app de mapas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="relative h-[60vh] min-h-80 overflow-hidden rounded-xl border shadow-sm">
        <div ref={contenedor} className="size-full" />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute right-3 top-3 z-10 h-9 shadow-md"
          onClick={verTodas}
        >
          <Maximize2 className="size-4" />
          Ver todas
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Toca un pin para ver el club abajo.
        {sinUbicar > 0 &&
          ` ${sinUbicar} ${sinUbicar === 1 ? 'club no tiene' : 'clubes no tienen'} ubicación todavía.`}
      </p>
    </div>
  )
}

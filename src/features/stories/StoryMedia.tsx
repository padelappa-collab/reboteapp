import { useEffect, useRef } from 'react'
import type { Historia } from './stories.api'

/**
 * El contenido de una historia: foto o vídeo.
 *
 * El vídeo llega de Cloudflare Stream en HLS, que Safari reproduce solo y el
 * resto de navegadores no. `hls.js` cubre a los demás, y se carga solo cuando
 * aparece la primera historia con vídeo: son 40 KB que quien solo ve fotos no
 * tiene por qué descargar.
 *
 * La duración manda sobre el temporizador de 5 segundos: una historia de vídeo
 * dura lo que dura el vídeo. Por eso avisa hacia fuera con `onDuracion` en vez
 * de dejar que el visor adivine.
 */
export function StoryMedia({
  historia,
  pausado,
  onDuracion,
  onFin,
}: {
  historia: Historia
  pausado: boolean
  onDuracion: (segundos: number) => void
  onFin: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const nodo = video.current
    if (!nodo || !historia.video_uid) return

    const fuente = `https://customer-${import.meta.env.VITE_CF_STREAM_CODE}.cloudflarestream.com/${historia.video_uid}/manifest/video.m3u8`

    // Safari y iOS reproducen HLS de fábrica; los demás necesitan la librería
    if (nodo.canPlayType('application/vnd.apple.mpegurl')) {
      nodo.src = fuente
      return
    }

    let hls: { destroy: () => void } | null = null
    let vigente = true

    import('hls.js').then(({ default: Hls }) => {
      if (!vigente || !Hls.isSupported()) return
      const instancia = new Hls()
      instancia.loadSource(fuente)
      instancia.attachMedia(nodo)
      hls = instancia
    })

    return () => {
      vigente = false
      hls?.destroy()
    }
  }, [historia.video_uid])

  // el visor pausa manteniendo pulsado; el vídeo tiene que acompañar
  useEffect(() => {
    const nodo = video.current
    if (!nodo) return
    if (pausado) nodo.pause()
    else void nodo.play().catch(() => {})
  }, [pausado, historia.id])

  if (historia.video_uid) {
    return (
      <video
        ref={video}
        playsInline
        autoPlay
        // sin controles: el visor ya tiene sus propios gestos, y unos controles
        // encima competirían con el toque para pasar de historia
        muted={false}
        onLoadedMetadata={(e) => onDuracion(e.currentTarget.duration)}
        onEnded={onFin}
        className="pointer-events-none absolute inset-0 size-full object-contain"
      />
    )
  }

  return (
    <img
      src={historia.imagen_url ?? ''}
      alt=""
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className="pointer-events-none absolute inset-0 size-full select-none object-contain"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    />
  )
}

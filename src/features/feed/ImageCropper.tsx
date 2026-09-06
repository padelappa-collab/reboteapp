import { cn } from '@/lib/utils'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

/**
 * Las proporciones de Instagram.
 *
 * Instagram admite entre 1.91:1 apaisado y 4:5 vertical, y su formato por
 * defecto para una foto vertical es 4:5 —1080×1350—, que es el que más pantalla
 * ocupa sin que la publicación siguiente desaparezca del todo. Ese es el que
 * arranca elegido.
 */
export const PROPORCIONES = [
  { id: '4:5', texto: 'Vertical', valor: 4 / 5 },
  { id: '1:1', texto: 'Cuadrada', valor: 1 },
  { id: '1.91:1', texto: 'Apaisada', valor: 1.91 },
] as const

export type ProporcionId = (typeof PROPORCIONES)[number]['id']

/** El lado largo del archivo que se sube. El mismo que usa Instagram. */
const SALIDA = 1080

export interface RecorteRef {
  /** Devuelve la foto ya recortada, lista para subir. */
  recortar: () => Promise<Blob>
}

/**
 * Encuadre de la foto antes de publicarla.
 *
 * La imagen se mueve arrastrando y se acerca con el deslizador. Lo que quede
 * dentro del marco es exactamente lo que se publica: el recorte se hace aquí,
 * sobre un lienzo, y lo que se sube ya viene con la forma elegida. Así el feed
 * no tiene que recortar nada y nadie se lleva la sorpresa de ver su foto
 * cortada por donde no quería.
 *
 * El zoom nunca deja hueco: el mínimo es el que cubre el marco entero, y el
 * desplazamiento se limita a los bordes de la propia imagen.
 */
export const ImageCropper = forwardRef<
  RecorteRef,
  {
    archivo: File
    proporcion: number
    /**
     * Encajar por alto en vez de por ancho.
     *
     * Para una historia el marco tiene que ocupar la pantalla entera, y en una
     * pantalla de teléfono lo que sobra es alto, no ancho: con `w-full` el
     * marco 9:16 se saldría por abajo.
     */
    llenarAlto?: boolean
  }
>(function ImageCropper({ archivo, proporcion, llenarAlto }, ref) {
  const marco = useRef<HTMLDivElement>(null)
  const imagen = useRef<HTMLImageElement | null>(null)

  const [url, setUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [medidas, setMedidas] = useState<{ nw: number; nh: number } | null>(null)

  const arrastre = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(archivo)
    setUrl(u)
    setZoom(1)
    setPos({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(u)
  }, [archivo])

  // al cambiar de proporción, el encuadre anterior deja de tener sentido
  useEffect(() => {
    setZoom(1)
    setPos({ x: 0, y: 0 })
  }, [proporcion])

  /** Escala mínima para que la imagen cubra el marco sin dejar aire. */
  const escalaBase = useCallback(() => {
    const caja = marco.current
    if (!caja || !medidas) return 1
    return Math.max(caja.clientWidth / medidas.nw, caja.clientHeight / medidas.nh)
  }, [medidas])

  /** Nadie puede arrastrar la foto más allá de su propio borde. */
  const limitar = useCallback(
    (x: number, y: number, z: number) => {
      const caja = marco.current
      if (!caja || !medidas) return { x: 0, y: 0 }
      const s = escalaBase() * z
      const maxX = Math.max(0, (medidas.nw * s - caja.clientWidth) / 2)
      const maxY = Math.max(0, (medidas.nh * s - caja.clientHeight) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      }
    },
    [medidas, escalaBase],
  )

  useEffect(() => {
    setPos((p) => limitar(p.x, p.y, zoom))
  }, [zoom, limitar])

  useImperativeHandle(ref, () => ({
    async recortar() {
      const caja = marco.current
      const img = imagen.current
      if (!caja || !img || !medidas) throw new Error('La foto todavía no cargó')

      const s = escalaBase() * zoom

      /*
       * El alto del recorte se deduce de la proporción, no del marco.
       *
       * El marco se dibuja con `aspect-ratio`, pero cuando además lo estira un
       * `flex-1` —como en la pantalla de historias— su proporción real acaba
       * desviándose unos píxeles de la pedida. Midiendo alto y ancho por
       * separado, el trozo recortado tenía una proporción y el lienzo otra, y
       * `drawImage` estiraba la imagen para encajarla: por eso lo publicado no
       * salía igual que la vista previa.
       *
       * Tomando solo el ancho y derivando el alto, el recorte y el lienzo
       * comparten proporción por construcción y no hay deformación posible.
       */
      const anchoVisible = caja.clientWidth / s
      const altoVisible = anchoVisible / proporcion

      // esquina superior izquierda del trozo visible, en píxeles del original
      const sx = (medidas.nw - anchoVisible) / 2 - pos.x / s
      const sy = (medidas.nh - altoVisible) / 2 - pos.y / s

      const salidaAncho = proporcion >= 1 ? SALIDA : Math.round(SALIDA * proporcion)
      const salidaAlto = proporcion >= 1 ? Math.round(SALIDA / proporcion) : SALIDA

      const lienzo = document.createElement('canvas')
      lienzo.width = salidaAncho
      lienzo.height = salidaAlto
      const ctx = lienzo.getContext('2d')
      if (!ctx) throw new Error('No se pudo preparar la imagen')

      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        img,
        Math.max(0, sx),
        Math.max(0, sy),
        anchoVisible,
        altoVisible,
        0,
        0,
        salidaAncho,
        salidaAlto,
      )

      return new Promise<Blob>((resolver, fallar) => {
        lienzo.toBlob(
          (b) => (b ? resolver(b) : fallar(new Error('No se pudo recortar la foto'))),
          'image/jpeg',
          0.9,
        )
      })
    },
  }))

  return (
    <div className={llenarAlto ? 'flex h-full min-h-0 flex-col gap-3' : 'space-y-3'}>
      <div
        ref={marco}
        className={cn(
          'relative touch-none select-none overflow-hidden bg-black',
          // `h-full w-auto` deja que mande el alto disponible y que el ancho
          // salga de la proporción. Con `flex-1` el marco se estiraba para
          // llenar el hueco y su forma real dejaba de ser la pedida.
          llenarAlto
            ? 'mx-auto h-full w-auto rounded-[var(--radius)]'
            : 'w-full rounded-[var(--radius)]',
        )}
        style={{ aspectRatio: String(proporcion) }}
        onPointerDown={(e) => {
          arrastre.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!arrastre.current) return
          setPos(
            limitar(e.clientX - arrastre.current.x, e.clientY - arrastre.current.y, zoom),
          )
        }}
        onPointerUp={() => {
          arrastre.current = null
        }}
      >
        {url && (
          <img
            ref={imagen}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setMedidas({
                nw: e.currentTarget.naturalWidth,
                nh: e.currentTarget.naturalHeight,
              })
            }
            className="absolute left-1/2 top-1/2 max-w-none origin-center"
            style={{
              width: medidas ? medidas.nw * escalaBase() * zoom : undefined,
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
            }}
          />
        )}
      </div>

      <label className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 flex-1 accent-[var(--primary)]"
          aria-label="Acercar la foto"
        />
      </label>

      {!llenarAlto && (
        <p className="text-xs text-muted-foreground">
          Arrastra la foto para elegir qué queda dentro del marco.
        </p>
      )}
    </div>
  )
})

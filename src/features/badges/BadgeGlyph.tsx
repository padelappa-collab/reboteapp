import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Los dibujos de las insignias.
 *
 * Treinta glifos propios en vez de emoji. Los emoji los dibuja cada sistema a su
 * manera —el 🎾 de un iPhone no es el de un Android—, no comparten grosor de
 * trazo con el resto de la interfaz y hay tres insignias distintas que acababan
 * con la misma llama. Una insignia es un logro: si se ve igual que la de al
 * lado, deja de serlo.
 *
 * Todos comparten vocabulario: caja de 24, trazo de 1.6, esquinas y remates
 * redondos, y la pala y la pelota como formas de base. Se pintan con
 * `currentColor`, así que el mismo dibujo sirve ganado —en neón— y bloqueado
 * —en gris— sin tener dos versiones de nada.
 */

/** La pala, la forma que más se repite. */
function Pala() {
  return (
    <>
      <ellipse cx="10" cy="9" rx="5.5" ry="6.5" />
      <path d="M8.6 15.3 8 18M11.4 15.3 12 18" />
      <rect x="8" y="18" width="4" height="4" rx="1.6" />
    </>
  )
}

/** La pelota, con su costura. */
function Pelota({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} />
      <path d={`M${cx - r} ${cy}a${r} ${r} 0 0 0 ${r * 2} 0`} />
    </>
  )
}

/** Los símbolos que distinguen los tres rankings sin tener que escribirlos. */
function Marca({ tipo, x, y }: { tipo: 'masc' | 'fem' | 'mixto'; x: number; y: number }) {
  if (tipo === 'fem') {
    return (
      <>
        <circle cx={x} cy={y - 1.5} r="2.4" />
        <path d={`M${x} ${y + 0.9}v3.2M${x - 1.5} ${y + 2.4}h3`} />
      </>
    )
  }
  if (tipo === 'masc') {
    return (
      <>
        <circle cx={x - 0.8} cy={y + 1} r="2.4" />
        <path d={`M${x + 1} ${y - 1}l2.6-2.6M${x + 1.4} ${y - 3.6}h2.2v2.2`} />
      </>
    )
  }
  return (
    <>
      <circle cx={x - 1.8} cy={y + 0.6} r="2.1" />
      <circle cx={x + 1.8} cy={y + 0.6} r="2.1" />
    </>
  )
}

const GLIFOS: Record<string, ReactNode> = {
  // ------------------------------------------------------------ Participación
  primer_partido: (
    <>
      <Pala />
      <Pelota cx={18.5} cy={16.5} r={3} />
    </>
  ),
  // los de conteo crecen en cantidad de pelotas: se leen sin contar del todo
  '10_partidos': (
    <>
      <Pelota cx={5.5} cy={12} r={3.2} />
      <Pelota cx={12} cy={12} r={3.2} />
      <Pelota cx={18.5} cy={12} r={3.2} />
    </>
  ),
  '50_partidos': (
    <>
      <Pelota cx={6} cy={7.5} r={2.7} />
      <Pelota cx={12} cy={7.5} r={2.7} />
      <Pelota cx={18} cy={7.5} r={2.7} />
      <Pelota cx={9} cy={16.5} r={2.7} />
      <Pelota cx={15} cy={16.5} r={2.7} />
    </>
  ),
  '100_partidos': (
    <>
      <Pelota cx={12} cy={12} r={4.5} />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </>
  ),
  primer_torneo: (
    <>
      <path d="M4 5h4v5H4zM4 14h4v5H4zM16 9.5h4v5h-4z" />
      <path d="M8 7.5h3v9H8zM11 12h5" />
    </>
  ),

  // -------------------------------------------------------------------- Racha
  // la racha sube: cada nivel añade un galón
  racha_3: <path d="M6 15l6-5 6 5M6 20l6-5 6 5" />,
  racha_5: <path d="M6 11l6-5 6 5M6 16l6-5 6 5M6 21l6-5 6 5" />,
  racha_10: (
    <>
      <path d="M6 13l6-5 6 5M6 18l6-5 6 5" />
      <path d="M12 3l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" />
    </>
  ),
  cazador: (
    <>
      <circle cx="11" cy="13" r="7.5" />
      <circle cx="11" cy="13" r="3.5" />
      <path d="M11 13l8-8M16.5 3.5h4v4" />
    </>
  ),
  invicto_torneo: (
    <>
      <path d="M12 2.5l7.5 3v6c0 4.6-3.1 8.2-7.5 10-4.4-1.8-7.5-5.4-7.5-10v-6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  maraton_semanal: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5v3.5" />
    </>
  ),
  mes_intenso: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 2.5v4M16 2.5v4" />
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),

  // --------------------------------------------------------------- Progresión
  // ascender son escalones y una flecha; la marca dice de qué ranking
  subio_categoria_masc: (
    <>
      <path d="M2.5 20h5v-4h5v-4h5" />
      <path d="M14 8.5l3.5-3.5L21 8.5" />
      <Marca tipo="masc" x={19} y={16} />
    </>
  ),
  subio_categoria_fem: (
    <>
      <path d="M2.5 20h5v-4h5v-4h5" />
      <path d="M14 8.5l3.5-3.5L21 8.5" />
      <Marca tipo="fem" x={19} y={15} />
    </>
  ),
  subio_categoria_mixto: (
    <>
      <path d="M2.5 20h5v-4h5v-4h5" />
      <path d="M14 8.5l3.5-3.5L21 8.5" />
      <Marca tipo="mixto" x={18.5} y={16} />
    </>
  ),
  // el podio, con la marca del ranking encima
  top_10_masc: (
    <>
      <path d="M2.5 21h19M4 21v-6h5v6M9 21v-9h6v9M15 21v-5h5v5" />
      <Marca tipo="masc" x={12} y={6} />
    </>
  ),
  top_10_fem: (
    <>
      <path d="M2.5 21h19M4 21v-6h5v6M9 21v-9h6v9M15 21v-5h5v5" />
      <Marca tipo="fem" x={12} y={5.5} />
    </>
  ),
  top_10_mixto: (
    <>
      <path d="M2.5 21h19M4 21v-6h5v6M9 21v-9h6v9M15 21v-5h5v5" />
      <Marca tipo="mixto" x={12} y={6} />
    </>
  ),
  numero_1_categoria: (
    <>
      <path d="M3 8l4 4 5-7 5 7 4-4v10H3z" />
      <path d="M3 21h18" />
    </>
  ),

  // -------------------------------------------------------------------- Social
  primer_post: (
    <>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8l-5 4v-4H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z" />
      <Pelota cx={12} cy={11} r={2.6} />
    </>
  ),
  // compañeros distintos: nodos unidos. Cuatro en "conecta 4", una cadena en el de diez
  conecta_4: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6h7M8.5 18h7M6 8.5v7M18 8.5v7" />
    </>
  ),
  casamentero: (
    <>
      <circle cx="7" cy="9" r="3.2" />
      <circle cx="14" cy="9" r="3.2" />
      <circle cx="10.5" cy="15.5" r="3.2" />
      <circle cx="17.5" cy="15.5" r="3.2" />
      <path d="M20.5 9.5h1.5M20.5 12.5h1.5" />
    </>
  ),
  racha_semanal: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 2.5v4M16 2.5v4" />
      <path d="M7.5 15.5l2.5 2.5 5-5" />
    </>
  ),
  comentarista: (
    <>
      <path d="M2.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-6l-4 3v-3H2.5z" />
      <path d="M20 10.5h.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H20v3l-3.5-3" />
    </>
  ),
  anfitrion: (
    <>
      <path d="M6 21V4l12 3.5L6 11" />
      <path d="M3.5 21h6" />
      <Pelota cx={17} cy={17} r={3} />
    </>
  ),
  tablon_activo: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M12 18v3" />
      <path d="M7 8.5h6M7 12h4" />
      <circle cx="17" cy="10" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),

  // ------------------------------------------------------------------ Especial
  todoterreno: (
    <>
      <circle cx="8" cy="10" r="5" />
      <circle cx="16" cy="10" r="5" />
      <circle cx="12" cy="16.5" r="5" />
    </>
  ),
  fundador: (
    <>
      <path d="M12 2.5l2.8 5.9 6.2.9-4.5 4.5 1.1 6.4-5.6-3.1-5.6 3.1 1.1-6.4L3 9.3l6.2-.9z" />
    </>
  ),
  veterano: (
    <>
      <path d="M8.5 2.5l3.5 6 3.5-6" />
      <path d="M8.5 2.5h7" />
      <circle cx="12" cy="15" r="6" />
      <path d="M12 12l1 2.2 2.4.3-1.7 1.7.4 2.4-2.1-1.2-2.1 1.2.4-2.4L8.6 14.5l2.4-.3z" />
    </>
  ),
  rey_de_la_cancha: (
    <>
      <rect x="2.5" y="7" width="19" height="12" rx="2" />
      <path d="M12 7v12M6 11.5v3M18 11.5v3" />
      <path d="M8 5l4-3 4 3" />
    </>
  ),
}

/** El que se pinta si algún día llega una insignia que esta versión no conoce. */
const POR_DEFECTO = (
  <>
    <Pala />
    <Pelota cx={18.5} cy={16.5} r={3} />
  </>
)

export function BadgeGlyph({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-7', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLIFOS[id] ?? POR_DEFECTO}
    </svg>
  )
}

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type RangoFecha = 'todas' | 'hoy' | 'manana' | 'semana' | 'exacta'

const ATAJOS: Array<{ valor: RangoFecha; texto: string }> = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'manana', texto: 'Mañana' },
  { valor: 'semana', texto: '7 días' },
  { valor: 'exacta', texto: 'Fecha' },
]

function mismoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * ¿Esta fecha entra en el rango elegido?
 *
 * Se compara por día del calendario y no por horas: quien filtra por "hoy"
 * quiere lo de hoy entero, no las próximas veinticuatro horas.
 */
export function enRango(iso: string, rango: RangoFecha, exacta: string): boolean {
  if (rango === 'todas') return true

  const fecha = new Date(iso)
  const hoy = new Date()

  if (rango === 'hoy') return mismoDia(fecha, hoy)

  if (rango === 'manana') {
    const manana = new Date(hoy)
    manana.setDate(hoy.getDate() + 1)
    return mismoDia(fecha, manana)
  }

  if (rango === 'semana') {
    const limite = new Date(hoy)
    limite.setDate(hoy.getDate() + 7)
    return fecha >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) &&
      fecha <= limite
  }

  // sin fecha escrita todavía, no se filtra nada
  if (!exacta) return true
  return mismoDia(fecha, new Date(`${exacta}T00:00:00`))
}

export interface FiltrosProps {
  rango: RangoFecha
  onRango: (r: RangoFecha) => void
  fecha: string
  onFecha: (f: string) => void
  cancha: string
  onCancha: (c: string) => void
  canchas: Array<{ id: string; nombre: string }>
  /** Filtros propios de cada pantalla, como el formato en torneos. */
  children?: ReactNode
  /** Si hay algo filtrado, para ofrecer limpiarlo. */
  activo: boolean
  onLimpiar: () => void
}

/**
 * Filtros de fecha y cancha para las listas largas.
 *
 * El tablón y los torneos crecen sin parar y llega un punto en que la lista
 * entera es ruido: quien busca con qué jugar el sábado no quiere recorrer
 * treinta publicaciones para encontrar las tres que le sirven.
 *
 * Los atajos van primero porque cubren casi todo lo que se pregunta de verdad
 * —hoy, mañana, esta semana— y el calendario aparece solo cuando se pide una
 * fecha concreta, que es lo menos frecuente.
 */
export function ListFilters({
  rango,
  onRango,
  fecha,
  onFecha,
  cancha,
  onCancha,
  canchas,
  children,
  activo,
  onLimpiar,
}: FiltrosProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ATAJOS.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => onRango(a.valor)}
            className={cn(
              // ancho mínimo y relleno iguales para todos: con solo padding, los
              // chips salían de anchos dispares —"Hoy" contra "7 días"— y la fila
              // se veía desalineada. El alto fijo los alinea con los campos.
              'h-9 min-w-[4.5rem] rounded-full border px-4 text-xs font-medium',
              'transition-colors',
              rango === a.valor
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {a.texto}
          </button>
        ))}

        {activo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={onLimpiar}
          >
            <X className="size-3" />
            Limpiar
          </Button>
        )}
      </div>

      {rango === 'exacta' && (
        <Input
          type="date"
          className="h-11"
          value={fecha}
          onChange={(e) => onFecha(e.target.value)}
        />
      )}

      <div className="flex gap-2">
        <Select value={cancha} onValueChange={onCancha}>
          <SelectTrigger className="h-11 flex-1">
            <SelectValue placeholder="Cancha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las canchas</SelectItem>
            {canchas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {children}
      </div>
    </div>
  )
}

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SetMarcador } from '@/types/database'

/** Cuenta de sets ganados por cada lado. Sirve para avisar antes de guardar. */
export function setsGanados(sets: SetMarcador[]): { a: number; b: number } {
  return sets.reduce(
    (acc, s) => ({
      a: acc.a + (s.a > s.b ? 1 : 0),
      b: acc.b + (s.b > s.a ? 1 : 0),
    }),
    { a: 0, b: 0 },
  )
}

export function marcadorValido(sets: SetMarcador[]): string | null {
  if (sets.length === 0) return 'Falta el marcador'
  if (sets.some((s) => s.a === s.b)) return 'Ningún set puede quedar empatado'
  const g = setsGanados(sets)
  if (g.a === g.b) return 'El partido no puede quedar empatado en sets'
  return null
}

export function SetsInput({
  sets,
  onChange,
  etiquetaA = 'Tu pareja',
  etiquetaB = 'Pareja rival',
}: {
  sets: SetMarcador[]
  onChange: (sets: SetMarcador[]) => void
  /** Quién es cada columna. Sin esto no se sabe de quién es cada número. */
  etiquetaA?: string
  etiquetaB?: string
}) {
  function editar(indice: number, lado: 'a' | 'b', valor: string) {
    const numero = Math.max(0, Math.min(20, Number(valor) || 0))
    onChange(sets.map((s, i) => (i === indice ? { ...s, [lado]: numero } : s)))
  }

  return (
    <div className="grid gap-3">
      <Label>Marcador</Label>

      {/* encabezado: deja claro qué columna es de quién */}
      <div className="flex items-end gap-3">
        <span className="w-12 shrink-0" />
        <span className="flex-1 text-center text-xs font-medium leading-tight">
          {etiquetaA}
        </span>
        <span className="w-3 shrink-0" />
        <span className="flex-1 text-center text-xs font-medium leading-tight text-muted-foreground">
          {etiquetaB}
        </span>
      </div>

      {sets.map((set, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-sm text-muted-foreground">Set {i + 1}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            className="h-11 text-center"
            aria-label={`Juegos de ${etiquetaA} en el set ${i + 1}`}
            value={set.a}
            onChange={(e) => editar(i, 'a', e.target.value)}
          />
          <span className="w-3 shrink-0 text-center text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            className="h-11 text-center"
            aria-label={`Juegos de ${etiquetaB} en el set ${i + 1}`}
            value={set.b}
            onChange={(e) => editar(i, 'b', e.target.value)}
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sets.length >= 5}
          onClick={() => onChange([...sets, { a: 0, b: 0 }])}
        >
          <Plus className="size-4" />
          Set
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sets.length <= 1}
          onClick={() => onChange(sets.slice(0, -1))}
        >
          <Minus className="size-4" />
          Quitar
        </Button>
      </div>
    </div>
  )
}

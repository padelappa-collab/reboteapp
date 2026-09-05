import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  CATEGORIAS_FEMENINO,
  CATEGORIAS_MASCULINO,
  eloInicial,
  type Categoria,
  type Genero,
} from '@/lib/categories'

const DESCRIPCION_MASCULINO: Record<string, string> = {
  '7ma': 'Empezando, juego social',
  '6ta': 'Ya sostengo un punto largo',
  '5ta': 'Intermedio, juego regular',
  '4ta': 'Intermedio alto, torneos locales',
  '3ra': 'Avanzado',
  '2da': 'Competitivo',
  '1ra': 'Élite',
}

const DESCRIPCION_FEMENINO: Record<string, string> = {
  D: 'Empezando, juego social',
  C: 'Intermedio, juego regular',
  B: 'Intermedio alto, torneos locales',
  A: 'Avanzada / competitiva',
}

/**
 * Género y categoría inicial.
 *
 * El género no es opcional ni cosmético: de él sale la escala del jugador y la
 * clasificación de cada partido (masculino / femenino / mixto). Se fija al
 * registrarse y no se puede cambiar después, porque cambiarlo movería el
 * ranking.
 */
export function GenderCategorySelect({
  genero,
  categoria,
  onGeneroChange,
  onCategoriaChange,
}: {
  genero: Genero | null
  categoria: Categoria | null
  onGeneroChange: (g: Genero) => void
  onCategoriaChange: (c: Categoria | null) => void
}) {
  const categorias = genero === 'femenino' ? CATEGORIAS_FEMENINO : CATEGORIAS_MASCULINO
  const descripciones = genero === 'femenino' ? DESCRIPCION_FEMENINO : DESCRIPCION_MASCULINO

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Género</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['masculino', 'femenino'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                onGeneroChange(g)
                onCategoriaChange(null)
              }}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm capitalize transition-colors',
                genero === g
                  ? 'border-primary bg-primary/10 font-medium text-court'
                  : 'border-border hover:bg-accent',
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Define tu escala y el tipo de cada partido. No se puede cambiar después.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="categoria">Categoría actual</Label>
        <Select
          value={categoria ?? undefined}
          onValueChange={(v) => onCategoriaChange(v as Categoria)}
          disabled={!genero}
        >
          <SelectTrigger id="categoria" className="w-full">
            <SelectValue placeholder={genero ? 'Elige tu categoría' : 'Primero elige género'} />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="font-medium">{c}</span>
                <span className="text-muted-foreground"> — {descripciones[c]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {genero && categoria && (
          <p className="text-xs text-muted-foreground">
            Arrancas con {eloInicial(categoria, genero)} puntos en tu ranking{' '}
            {genero} y los mismos en mixto.
          </p>
        )}
      </div>
    </div>
  )
}

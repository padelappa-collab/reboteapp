import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { colorDeAvatar } from '@/components/UserAvatar'
import { buscarJugadores, type JugadorResumen } from './matches.api'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Elige los 4 jugadores del partido.
 *
 * Todos tienen que estar registrados: el ELO no se puede mover para alguien que
 * no existe. Para conseguir gente nueva está el tablón.
 */
export function PlayerPicker({
  etiqueta,
  seleccionados,
  yaElegidos,
  onChange,
  maximo = 2,
}: {
  etiqueta: string
  seleccionados: JugadorResumen[]
  /** Ids ya usados en el partido, para no repetir jugador. */
  yaElegidos: string[]
  onChange: (jugadores: JugadorResumen[]) => void
  maximo?: number
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<JugadorResumen[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    setBuscando(true)

    const t = setTimeout(async () => {
      try {
        const encontrados = await buscarJugadores(texto, yaElegidos)
        if (vigente) setResultados(encontrados)
      } finally {
        if (vigente) setBuscando(false)
      }
    }, 250)

    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [texto, abierto, yaElegidos])

  // Filtrar tambien al pintar, no solo al buscar: cada buscador guarda sus
  // propios resultados, y los del otro pueden haber quedado desactualizados
  // justo despues de elegir a alguien. Sin esto se podia añadir dos veces al
  // mismo jugador aprovechando ese instante.
  const visibles = resultados.filter(
    (j) => !yaElegidos.includes(j.id) && !seleccionados.some((s) => s.id === j.id),
  )

  const lleno = seleccionados.length >= maximo

  return (
    <div className="grid gap-2">
      <Label>{etiqueta}</Label>

      <div className="grid gap-2">
        {seleccionados.map((j) => (
          <div
            key={j.id}
            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
          >
            <Avatar className="size-8">
              <AvatarFallback
                className="text-xs font-medium text-white"
                style={{ backgroundColor: colorDeAvatar(j.id) }}
              >
                {iniciales(j.nombre)}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm">
              {j.username ? `@${j.username}` : j.nombre}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar a ${j.nombre}`}
              onClick={() => onChange(seleccionados.filter((s) => s.id !== j.id))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {!lleno && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Buscar por usuario o nombre"
              value={texto}
              onFocus={() => setAbierto(true)}
              onChange={(e) => {
                setTexto(e.target.value)
                setAbierto(true)
              }}
            />
          </div>

          {abierto && (
            <div className="max-h-56 overflow-y-auto rounded-lg border">
              {buscando && visibles.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Buscando…</p>
              )}
              {!buscando && visibles.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Nadie con ese usuario o nombre. Los 4 jugadores tienen que
                  estar registrados, y las cuentas privadas solo salen si
                  escribes su usuario.
                </p>
              )}
              {visibles.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left',
                    'hover:bg-accent',
                  )}
                  onClick={() => {
                    // ultimo cinturon: nunca dos veces el mismo jugador
                    if (seleccionados.some((s) => s.id === j.id)) return
                    onChange([...seleccionados, j])
                    setTexto('')
                    setAbierto(false)
                  }}
                >
                  <Avatar className="size-8">
                    <AvatarFallback
                      className="text-xs font-medium text-white"
                      style={{ backgroundColor: colorDeAvatar(j.id) }}
                    >
                      {iniciales(j.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    {/* el usuario distingue a dos jugadores del mismo nombre */}
                    <span className="block truncate text-sm">
                      {j.username ? `@${j.username}` : j.nombre}
                    </span>
                    {j.username && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {j.nombre}
                      </span>
                    )}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {j.genero === 'masculino' ? 'H' : 'M'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

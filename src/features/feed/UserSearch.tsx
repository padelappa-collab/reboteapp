import { Lock, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/useAuth'
import {
  buscarJugadores,
  dejarDeSeguir,
  seguir,
  type JugadorBuscado,
} from './feed.api'

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Buscar jugadores y seguirlos sin salir de la pantalla. */
export function UserSearch() {
  const { perfil } = useAuth()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resultados, setResultados] = useState<JugadorBuscado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [enviando, setEnviando] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto || !perfil) return
    let vigente = true
    setBuscando(true)

    const t = setTimeout(async () => {
      try {
        const encontrados = await buscarJugadores(texto, perfil.id)
        if (vigente) setResultados(encontrados)
      } catch (error) {
        console.error('No se pudo buscar', error)
      } finally {
        if (vigente) setBuscando(false)
      }
    }, 250)

    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [texto, abierto, perfil])

  if (!perfil) return null

  async function alternar(jugador: JugadorBuscado) {
    setEnviando(jugador.id)
    try {
      if (jugador.estado) {
        await dejarDeSeguir(jugador.id, perfil!.id)
      } else {
        const estado = await seguir(jugador.id)
        toast.success(
          estado === 'pendiente'
            ? 'Solicitud enviada'
            : `Ahora sigues a ${jugador.nombre}`,
        )
      }
      setResultados(await buscarJugadores(texto, perfil!.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar')
    } finally {
      setEnviando(null)
    }
  }

  function etiqueta(estado: JugadorBuscado['estado']) {
    if (estado === 'aceptado') return 'Siguiendo'
    if (estado === 'pendiente') return 'Pendiente'
    return 'Seguir'
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9 pr-10"
          placeholder="Buscar por usuario o nombre"
          value={texto}
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
          }}
        />
        {abierto && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cerrar búsqueda"
            className="absolute right-1 top-1/2 size-9 -translate-y-1/2"
            onClick={() => {
              setTexto('')
              setAbierto(false)
            }}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {abierto && (
        <div className="divide-y rounded-lg border">
          {buscando && resultados.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Buscando…</p>
          )}

          {!buscando && resultados.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              {texto.trim()
                ? 'Nadie con ese usuario o nombre.'
                : 'Todavía no hay otros jugadores registrados.'}
            </p>
          )}

          {!texto.trim() && resultados.length > 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Jugadores más activos
            </p>
          )}

          {resultados.map((j) => (
            <div key={j.id} className="flex items-center gap-3 p-2.5">
              <Link to={`/jugador/${j.id}`}>
                <Avatar className="size-9">
                  {j.foto_url && <AvatarImage src={j.foto_url} alt="" />}
                  <AvatarFallback className="text-xs">
                    {iniciales(j.nombre)}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <Link to={`/jugador/${j.id}`} className="min-w-0 flex-1">
                {/* el usuario va primero porque es lo unico que no se repite:
                    dos jugadores pueden llamarse igual, tener el mismo usuario no */}
                <p className="flex items-center gap-1 truncate text-sm font-medium">
                  {j.username ? `@${j.username}` : j.nombre}
                  {j.cuenta_privada && (
                    <Lock className="size-3 shrink-0 text-muted-foreground" />
                  )}
                </p>
                {j.username && (
                  <p className="truncate text-xs text-muted-foreground">{j.nombre}</p>
                )}
              </Link>

              <Button
                size="sm"
                variant={j.estado ? 'outline' : 'default'}
                className="h-9 shrink-0"
                disabled={enviando === j.id}
                onClick={() => alternar(j)}
              >
                {etiqueta(j.estado)}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Categoria, Genero } from '@/lib/categories'
import { crearPerfil } from './auth.api'
import { GenderCategorySelect } from './GenderCategorySelect'
import { useAuth } from './useAuth'

/** El piloto es en Cartagena; Barranquilla entra en una fase posterior. */
const CIUDADES = ['Cartagena']

export default function ProfileSetupPage() {
  const { session, refrescarPerfil } = useAuth()
  const navegar = useNavigate()

  const [nombre, setNombre] = useState(
    (session?.user.user_metadata.full_name as string | undefined) ?? '',
  )
  const [ciudad, setCiudad] = useState(CIUDADES[0])
  const [genero, setGenero] = useState<Genero | null>(null)
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!session || !genero || !categoria) return

    setEnviando(true)
    try {
      await crearPerfil({
        id: session.user.id,
        nombre,
        ciudad,
        genero,
        categoriaInicial: categoria,
      })
      await refrescarPerfil()
      toast.success('Listo, ya puedes registrar partidos')
      navegar('/', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el perfil')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Tu perfil</CardTitle>
          <CardDescription>
            Con esto arranca tu ranking. Toma menos de un minuto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
                placeholder="Como te conocen en la cancha"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Select value={ciudad} onValueChange={setCiudad}>
                <SelectTrigger id="ciudad" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CIUDADES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <GenderCategorySelect
              genero={genero}
              categoria={categoria}
              onGeneroChange={setGenero}
              onCategoriaChange={setCategoria}
            />

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={enviando || !genero || !categoria || nombre.trim().length < 2}
            >
              {enviando ? 'Guardando…' : 'Empezar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { Wordmark } from '@/components/Wordmark'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrarConEmail } from './auth.api'
import { OAuthButtons } from './OAuthButtons'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await registrarConEmail(email, password)
      setEnviado(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la cuenta')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <Wordmark />

        <Card>
          <CardHeader>
            <CardTitle>Revisa tu correo</CardTitle>
            <CardDescription>
              Te enviamos un enlace a {email} para confirmar la cuenta. Al abrirlo
              terminas de armar tu perfil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link to="/entrar">Volver</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <Wordmark />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>Registra tus partidos y sigue tu ranking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={enviar} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
            </div>
            <Button type="submit" className="h-11 w-full" disabled={enviando}>
              {enviando ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <OAuthButtons deshabilitado={enviando} />


          <p className="text-center text-xs text-muted-foreground">
            Al continuar aceptas los{' '}
            <Link to="/terminos" className="underline underline-offset-4">
              términos
            </Link>{' '}
            y la{' '}
            <Link to="/privacidad" className="underline underline-offset-4">
              política de privacidad
            </Link>
            .
          </p>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/entrar" className="font-medium text-court underline-offset-4 hover:underline">
              Entra
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

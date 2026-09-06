import { useState, type FormEvent } from 'react'
import { Wordmark } from '@/components/Wordmark'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { entrarConEmail } from './auth.api'
import { OAuthButtons } from './OAuthButtons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await entrarConEmail(email, password)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo entrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <Wordmark />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>Tu ranking de pádel en Cartagena.</CardDescription>
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
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
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium text-court underline-offset-4 hover:underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const supabaseListo =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)

/**
 * Pantalla temporal del paso 1 (setup). La reemplaza el router real
 * cuando entren auth y las pantallas de la app.
 */
export default function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Padel Cartagena</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Setup inicial listo: Vite + React + TypeScript + Tailwind + shadcn/ui.
          </p>
          <div className="flex items-center justify-between">
            <span>Conexion a Supabase</span>
            {supabaseListo ? (
              <Badge>configurada</Badge>
            ) : (
              <Badge variant="destructive">falta .env.local</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

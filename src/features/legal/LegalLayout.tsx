import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Fecha de la última revisión de los textos legales. */
export const ACTUALIZADO = '1 de septiembre de 2026'

export const CORREO_CONTACTO = 'padelappa@gmail.com'

/**
 * Marco de las páginas legales. Son públicas a propósito: Google las exige
 * accesibles sin sesión para publicar la app, y las tiendas también.
 */
export function LegalLayout({
  titulo,
  children,
}: {
  titulo: string
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            to="/entrar"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
          <span className="font-semibold tracking-tight">REBOTEAPP</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Última actualización: {ACTUALIZADO}
        </p>

        <div
          className={[
            'mt-6 space-y-6 text-sm leading-relaxed',
            '[&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
            '[&_p]:text-muted-foreground',
            '[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-muted-foreground',
            '[&_li>strong]:text-foreground',
            '[&_a]:text-court [&_a]:underline-offset-4 hover:[&_a]:underline',
          ].join(' ')}
        >
          {children}
        </div>

        <footer className="mt-10 border-t pt-6 text-sm">
          <div className="flex gap-4">
            <Link to="/privacidad" className="text-muted-foreground hover:text-foreground">
              Privacidad
            </Link>
            <Link to="/terminos" className="text-muted-foreground hover:text-foreground">
              Términos
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}

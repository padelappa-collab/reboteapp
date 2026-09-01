import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor queda configurado pero SIN usar todavia.
 * El piloto de Cartagena se prueba primero como web app (Vercel) desde el
 * navegador del celular. Las plataformas nativas (`npx cap add ios/android`)
 * se generan en una fase posterior, cuando el producto este validado.
 */
const config: CapacitorConfig = {
  appId: 'online.reboteapp',
  appName: 'REBOTEAPP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config

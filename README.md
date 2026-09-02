# REBOTEAPP — piloto Cartagena

App de ranking y partidos para jugadores amateur de padel. El piloto se prueba
como **web app** desde el navegador del celular; las apps nativas vienen despues.

## Stack

React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui + Supabase.
Capacitor queda configurado (`capacitor.config.ts`) pero **sin usar** en esta fase.

## Arranque

```bash
npm install
cp .env.example .env.local   # rellena URL y anon key de Supabase
npm run dev
```

`npm run dev` expone el servidor en la red local (`server.host`), asi que puedes
abrirlo desde el celular con la IP del equipo para probar en movil de verdad.

## Scripts

| Script | Que hace |
| --- | --- |
| `npm run dev` | servidor de desarrollo |
| `npm run build` | typecheck + build de produccion |
| `npm run test` | tests unitarios (Vitest) |
| `npm run typecheck` | solo typecheck |
| `npm run lint` | oxlint |
| `npm run cap:sync` | build + sync de Capacitor (fase nativa, aun no se usa) |

## Estructura

```
src/
  components/    UI compartida (shadcn en components/ui)
  features/      un directorio por dominio (auth, matches, ranking, ...)
  lib/           logica pura y cliente de Supabase (elo, categorias, badges)
  types/         tipos de dominio y tipos generados de la base de datos
supabase/
  migrations/    esquema versionado
  functions/     edge functions
```

## Base de datos

Las migraciones viven en `supabase/migrations/` y se aplican con la CLI de
Supabase. Los tipos de `src/types/database.ts` se regeneran con:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

## Despliegue

La app es una SPA estatica: `npm run build` produce `dist/` y cualquier hosting
estatico la sirve. Estan configuradas las dos reescrituras necesarias para que
las rutas internas no den 404 al recargar:

| Hosting | Archivo |
| --- | --- |
| Vercel | `vercel.json` |
| Cloudflare Pages | `public/_redirects` |

Comando de build: `npm run build`. Carpeta de salida: `dist`.

Variables de entorno del proyecto: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
y `VITE_APPLE_SIGN_IN`. Son de tiempo de compilacion (prefijo `VITE_`), asi que
al cambiarlas hay que volver a desplegar.

**Dominio**: `reboteapp.online`, pendiente de comprar. Mientras tanto el piloto
corre en la URL que asigna Vercel. El `appId` de Capacitor ya quedo derivado del
dominio invertido (`online.reboteapp`) porque en las tiendas no se puede cambiar
despues de publicar.

Cuando el dominio este activo hay que registrarlo en tres sitios o el login se
rompe:

| Donde | Que agregar |
| --- | --- |
| Supabase > Authentication > URL Configuration | Site URL `https://reboteapp.online` y Redirect URL `https://reboteapp.online/**` |
| Google Cloud > Credentials > origenes de JavaScript | `https://reboteapp.online` |
| Vercel > Settings > Domains | `reboteapp.online` |

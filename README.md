# REBOTEAPP

Ranking y organización de partidos para jugadores amateur de pádel. En piloto
con jugadores reales en Cartagena, Colombia.

El pádel amateur no tiene forma de saber quién juega a qué nivel. La gente se
organiza por WhatsApp, arma partidos desparejados y nadie lleva la cuenta.
REBOTEAPP resuelve eso: registras el partido, los cuatro jugadores lo confirman,
y el ranking se mueve solo.

**Stack**: React 19 · TypeScript · Vite · Tailwind v4 · Supabase (Postgres + RLS
+ Edge Functions) · PWA con notificaciones push.

---

## Lo que tiene de interesante

### Tres rankings ELO que no se mezclan

Cada jugador tiene un ELO masculino o femenino —según su género— y otro mixto.
Un partido mueve **solo** el ranking que le corresponde, y el tipo se deduce de
quiénes jugaron, no se elige a mano. Puedes estar en cuarta masculina y
empezando en mixto.

El factor K baja con la experiencia (45 → 30 → 20), así que los primeros
partidos ubican rápido a alguien y después el ranking se estabiliza.

### Categorías con histéresis

Las categorías salen del ELO, pero con un colchón: si bajas apenas por debajo
del umbral no pierdes la categoría de inmediato. Sin eso, quien esté justo en la
frontera sube y baja cada semana, y una categoría que oscila no significa nada.

La barra de progreso se mide desde el suelo del colchón, no desde el umbral, que
es lo que la hace representar el avance real.

### Las reglas viven en la base de datos

Ninguna regla de negocio se aplica solo en el cliente. El ELO, las
confirmaciones, las categorías, las insignias y los permisos son funciones y
disparadores de Postgres. El cliente no puede saltárselas aunque alguien hable
directo con la API.

Concretamente: **24 tablas**, **55 políticas RLS**, **101 funciones**, **46
disparadores** y **5 trabajos programados**. Los permisos de escritura están
acotados por columna, no solo por fila: un jugador puede cambiar su nombre y su
foto, pero su ELO no es escribible ni siquiera por él.

### Paridad SQL ↔ TypeScript verificada

El cálculo del ELO y de las categorías existe dos veces: en Postgres, que es
donde manda, y en TypeScript, para que la interfaz pueda previsualizar sin
esperar al servidor. **153 tests** comparan las dos implementaciones contra las
mismas fixtures, así que no pueden divergir en silencio.

### Confirmación por los cuatro jugadores

Un resultado no cuenta hasta que los cuatro lo confirman. Cualquiera puede
marcar desacuerdo, y entonces el partido se congela y el marcador se puede
corregir. Es la parte que hace que un ranking amateur sea creíble: nadie puede
inflarse solo.

### Y además

- **Torneos** con inscripción por parejas, restricciones de nivel, sorteo de
  cuadro y resultados que cuentan para el ranking general.
- **Tablón** para buscar el cuarto que falta, con cupos y herencia del autor si
  quien publicó se sale.
- **Feed, historias de 24 h y mensajes directos** con Supabase Realtime. El
  vídeo va por Cloudflare Stream para no gastar el almacenamiento del proyecto.
- **Notificaciones push** (Web Push + VAPID) con agrupación: tres me gusta
  seguidos son un aviso, no tres.
- **30 insignias** con glifos SVG dibujados a mano, sin emoji: cada sistema los
  pinta distinto y ninguno casa con el grosor de trazo del resto.
- **PWA instalable**, que en iPhone es la única forma de recibir notificaciones
  y que durante el piloto permite corregir algo y tenerlo en todos los teléfonos
  sin pasar por la revisión de una tienda.

---

## Arranque

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev
```

`npm run dev` expone el servidor en la red local, así que puedes abrirlo desde
el celular con la IP del equipo y probar en un móvil de verdad.

| Script | Qué hace |
| --- | --- |
| `npm run dev` | servidor de desarrollo |
| `npm run build` | typecheck + build de producción |
| `npm run test` | tests unitarios y de paridad (Vitest) |
| `npm run lint` | oxlint |

## Estructura

```
src/
  components/    UI compartida (shadcn en components/ui)
  features/      un directorio por dominio: auth, matches, ranking, tournaments,
                 board, feed, stories, messages, badges, courts, profile...
  lib/           lógica pura y cliente de Supabase (elo, categorías, push)
  types/         tipos de dominio y tipos generados de la base
supabase/
  migrations/    esquema versionado (59 migraciones)
  functions/     edge functions: push, limpieza programada, puente con Cloudflare
```

## Base de datos

Las migraciones se aplican con la CLI de Supabase. Los tipos se regeneran con:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

## Despliegue

SPA estática: `npm run build` produce `dist/`. Están configuradas las
reescrituras para que las rutas internas no den 404 al recargar (`vercel.json` y
`public/_redirects`).

Variables de entorno, todas de tiempo de compilación por el prefijo `VITE_`, así
que al cambiarlas hay que **volver a desplegar sin caché de construcción**:

| Variable | Para qué |
| --- | --- |
| `VITE_SUPABASE_URL` | proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | clave publicable; la seguridad la dan las políticas RLS |
| `VITE_VAPID_PUBLIC_KEY` | notificaciones push |
| `VITE_CF_STREAM_CODE` | reproducción de vídeo en historias |
| `VITE_APPLE_SIGN_IN` | apagado hasta tener cuenta de Apple Developer |

Del lado del servidor, las Edge Functions necesitan sus propios secretos
(`VAPID_PRIVATE_KEY`, `CF_ACCOUNT_ID`, `CF_STREAM_TOKEN`), configurados en el
panel de Supabase y nunca en el repositorio.

---

## Estado

En piloto con jugadores reales en Cartagena.

Este repositorio es el **demo web**: la PWA con la que se probó el producto y
con la que corre el piloto. Se instala desde el navegador y no depende de las
tiendas para actualizarse, que mientras se está aprendiendo qué funciona vale
más que ser nativa.

La app para las tiendas está hecha en **React Native**, en un repositorio aparte
y privado.

En `package.json` quedan los paquetes de Capacitor, de cuando la idea era
empaquetar esta misma web para las tiendas. Ese camino se descartó a favor de
una app nativa de verdad, pero la configuración sigue aquí.

Lo que sigue es abrir a más ciudades, una vez que el ranking de Cartagena tenga
masa suficiente para ser representativo: un ELO con pocos jugadores mide el
grupo, no el nivel.

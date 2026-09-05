// =============================================================================
// Genera los PNG del icono a partir del SVG maestro.
//
// El manifest y iOS necesitan PNG: el SVG en `manifest.icons` casi ningún
// Android lo acepta, y Safari ignora cualquier cosa que no sea PNG para el
// icono de la pantalla de inicio.
//
// La fuente son los dos SVG de src/assets. Si el logo cambia, se cambia ahí y
// se vuelve a correr `npm run iconos`: ningún PNG se retoca a mano, que es como
// acaban descuadrados entre sí.
//
// Sobre los márgenes. El dibujo original llega hasta el borde del lienzo, y eso
// no sirve para un icono: Android recorta los adaptativos con una máscara que
// se come las esquinas, y lo primero que desaparecería es la pelota. Cada
// destino se compone aquí sobre su fondo con el margen que le corresponde:
//
//   · 'maskable' es el más estrecho —el sistema puede recortar hasta un círculo
//     inscrito, así que todo lo que importa cabe en el 70% central.
//   · iOS recorta menos, pero recorta.
//   · El favicon no lo recorta nadie y puede llenar más.
//
// Y las esquinas redondeadas van solo donde el sistema NO redondea por su
// cuenta. Un icono ya redondeado que además recorta iOS se ve mordido.
// =============================================================================

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const FONDO = { r: 10, g: 10, b: 10, alpha: 1 } // #0A0A0A

/** Solo la pala, sin fondo: el fondo lo pone cada destino. */
const marca = await readFile(join(raiz, 'src/assets/logo.svg'))

/** [archivo, lado, cuánto del lado ocupa el dibujo, esquinas redondeadas] */
const salidas = [
  ['public/icon-192.png', 192, 0.86, false, 'manifest, instalación en Android'],
  ['public/icon-512.png', 512, 0.86, false, 'manifest, splash y tiendas'],
  ['public/icon-512-maskable.png', 512, 0.7, false, 'Android adaptativo, zona segura'],
  ['public/apple-touch-icon.png', 180, 0.82, false, 'iOS, pantalla de inicio'],
  ['public/logo-96.png', 96, 0.88, true, 'cabecera de la app y respaldo del favicon'],
  ['resources/icon.png', 1024, 0.82, false, 'maestro de @capacitor/assets'],
]

await mkdir(join(raiz, 'resources'), { recursive: true })

for (const [ruta, lado, ocupa, redondear, para] of salidas) {
  const dibujo = await sharp(marca, { density: 900 })
    .resize(Math.round(lado * ocupa), Math.round(lado * ocupa), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer()

  let lienzo = sharp({
    create: { width: lado, height: lado, channels: 4, background: FONDO },
  }).composite([{ input: dibujo, gravity: 'center' }])

  if (redondear) {
    // 22% del lado es la proporción que usan iOS y Android para su recorte
    const radio = Math.round(lado * 0.22)
    const mascara = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">` +
        `<rect width="${lado}" height="${lado}" rx="${radio}" fill="#fff"/></svg>`,
    )
    lienzo = sharp(await lienzo.png().toBuffer()).composite([
      { input: mascara, blend: 'dest-in' },
    ])
  }

  await writeFile(join(raiz, ruta), await lienzo.png({ compressionLevel: 9 }).toBuffer())
  console.log(`${ruta.padEnd(32)} ${String(lado).padStart(4)}px  ${para}`)
}

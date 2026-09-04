// Service worker de REBOTEAPP.
//
// Solo hace dos cosas: mostrar el aviso cuando llega un push, y llevar a la
// pantalla correcta cuando alguien lo toca. Si la app ya está abierta en esa
// pantalla, la trae al frente en vez de abrir otra pestaña.

self.addEventListener('push', (evento) => {
  if (!evento.data) return

  let datos
  try {
    datos = evento.data.json()
  } catch {
    datos = { titulo: 'REBOTEAPP', cuerpo: evento.data.text() }
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo ?? 'REBOTEAPP', {
      body: datos.cuerpo ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // agrupa los avisos del mismo tipo en vez de apilarlos
      tag: datos.tipo ?? 'reboteapp',
      data: { url: datos.enlace ?? '/novedades' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = evento.notification.data?.url ?? '/novedades'

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abiertas) => {
      for (const ventana of abiertas) {
        if ('focus' in ventana) {
          ventana.navigate(destino)
          return ventana.focus()
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})

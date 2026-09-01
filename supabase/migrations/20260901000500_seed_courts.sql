-- =============================================================================
-- Semilla del directorio de canchas (Cartagena).
--
-- OJO: estas filas son PROVISIONALES y van con verificado = false. No son datos
-- confirmados con los clubes: sirven para que las pantallas tengan contenido
-- mientras llega la lista real (nombre, dirección, número de canchas y enlace
-- de reserva de Playtomic o WhatsApp del club).
--
-- Para cargar la lista definitiva, usa esta plantilla:
--
--   insert into public.courts
--     (nombre, ciudad, direccion, cantidad_canchas, booking_url, telefono, lat, lng, verificado)
--   values
--     ('Nombre del club', 'Cartagena', 'Dirección', 4,
--      'https://playtomic.io/...', '+57 300 000 0000', 10.3997, -75.5544, true);
-- =============================================================================

insert into public.courts
  (nombre, ciudad, direccion, cantidad_canchas, booking_url, telefono, lat, lng, verificado)
values
  ('[POR VERIFICAR] Club de pádel Bocagrande', 'Cartagena',
   'Bocagrande', 3, null, null, 10.3997, -75.5544, false),
  ('[POR VERIFICAR] Club de pádel Manga', 'Cartagena',
   'Manga', 2, null, null, 10.4092, -75.5325, false),
  ('[POR VERIFICAR] Club de pádel Crespo', 'Cartagena',
   'Crespo', 4, null, null, 10.4470, -75.5140, false);

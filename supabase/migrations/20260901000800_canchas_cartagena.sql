-- =============================================================================
-- Clubes reales de Cartagena, en reemplazo de las filas provisionales.
--
-- Los nombres, direcciones y número de canchas los aportó el dueño del piloto.
-- Las COORDENADAS son aproximaciones a nivel de barrio o de dirección, hechas
-- sin verificar contra el sitio real: por eso todas las filas quedan con
-- verificado = false hasta que alguien las revise en el mapa.
--
-- Los enlaces de reserva llegan después; por ahora booking_url va en NULL y la
-- ficha del club lo dice explícitamente en vez de mostrar un botón muerto.
-- =============================================================================

-- Dato suelto que no cabe en las otras columnas (canchas de otro deporte,
-- horarios, aclaraciones del club).
alter table public.courts add column if not exists nota text;

-- Enlace de chat del club. Va aparte de booking_url porque varios tienen las
-- dos vías: reserva en línea y WhatsApp para lo que el sistema no cubre.
alter table public.courts add column if not exists whatsapp text;

-- Se puede volver a ejecutar: borra el directorio de Cartagena y lo rehace.
-- Es seguro mientras los partidos no referencien canchas (cancha_id queda en
-- NULL por la FK), que es el caso durante la carga inicial del piloto.
delete from public.courts where ciudad = 'Cartagena';

insert into public.courts
  (nombre, ciudad, direccion, cantidad_canchas, booking_url, whatsapp, telefono,
   lat, lng, nota, verificado)
values
  -- coordenadas tomadas de la ficha de Google Maps del club
  ('Padel Club Cartagena', 'Cartagena',
   'Bocagrande, Cra. 4 # 7-28', 2,
   'https://padel-club-cartagena.odoo.com/appointment', null, null,
   10.4011292, -75.5545262, null, true),

  ('Match Point', 'Cartagena',
   'El Laguito, Hotel Hilton', 3,
   'https://playtomic.com/clubs/matchpoint-club', null, null,
   10.3940461, -75.5603114,
   'Dentro del Hotel Hilton. En Google Maps aparece como "Match Padel Club Cartagena".',
   true),

  ('Easy Padel Club', 'Cartagena',
   'Cl. 5 #5-36', 3,
   'https://www.easycancha.com/redirectTo/easycancha?urlbase64=L2Jvb2svY2x1YnMvMTk5OC9zcG9ydHM=&country=CO&lang=es-CO',
   'https://wa.me/573233933380?text=Hola%2C%20quiero%20reservar%20una%20cancha.%20%C2%BFQu%C3%A9%20horarios%20tienen%20disponibles%3F',
   '+573233933380',
   10.3968648, -75.5572490, null, true),

  ('Bahía Pádel & Social Club', 'Cartagena',
   'Manga, Calle 29 #18B-29', 2,
   'https://www.easycancha.com/book/clubs/1801/sports',
   'https://wa.me/573233884528?text=Hola%20Bah%C3%ADa%2C%20quiero%20reservar%20una%20cancha.%20%C2%BFQu%C3%A9%20horarios%20tienen%20disponibles%3F',
   '+573233884528',
   10.4170206, -75.5370558, null, true),

  ('Blue Padel Cartagena', 'Cartagena',
   'Barcelona de Indias, zona norte', 3,
   null,
   'https://wa.me/573117484503?text=Hola%20Blue%20Padel%2C%20quiero%20reservar%20una%20cancha.%20%C2%BFQu%C3%A9%20horarios%20tienen%20disponibles%3F',
   '+573117484503',
   10.5163335, -75.4716984,
   'Tiene además una cancha de fútbol 6. Queda en la zona norte, saliendo por la Vía al Mar.',
   true),

  ('Padel House', 'Cartagena',
   'Barrio Crespo', 3, null, null, null,
   10.44500, -75.51500, 'Dentro de Sporty Social Club.', false),

  ('Mucho Pádel', 'Cartagena',
   'Vía Manzanillo, Km 1', 6, null, null, null,
   10.46500, -75.48700, null, false),

  ('Padelmania', 'Cartagena',
   'Estación Puerta de las Américas, zona norte', 2, null, null, null,
   10.44600, -75.50600, null, false);

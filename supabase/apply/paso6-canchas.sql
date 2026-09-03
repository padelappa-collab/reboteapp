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

-- fuera las tres filas de relleno
delete from public.courts where nombre like '[POR VERIFICAR]%';

insert into public.courts
  (nombre, ciudad, direccion, cantidad_canchas, booking_url, telefono, lat, lng, nota, verificado)
values
  ('Padel Club Cartagena', 'Cartagena',
   'Bocagrande, Cra. 4 # 7-28', 2, null, null,
   10.39850, -75.55600, null, false),

  ('Match Point', 'Cartagena',
   'El Laguito, Hotel Hilton', 3, null, null,
   10.38970, -75.56360, 'Dentro del Hotel Hilton.', false),

  ('Easy Padel Club', 'Cartagena',
   'Cl. 5 #5-36', 3, null, null,
   10.39600, -75.55800, null, false),

  ('Bahía Pádel & Social Club', 'Cartagena',
   'Manga, Calle 29 #18B-29', 2, null, null,
   10.40850, -75.53050, null, false),

  ('Blue Padel Cartagena', 'Cartagena',
   'El Cabrero / Barcelona de Indias', 3, null, null,
   10.42900, -75.54800,
   'Tiene además una cancha de fútbol 6. Dirección exacta pendiente.', false),

  ('Padel House', 'Cartagena',
   'Barrio Crespo', 3, null, null,
   10.44500, -75.51500, 'Dentro de Sporty Social Club.', false),

  ('Mucho Pádel', 'Cartagena',
   'Vía Manzanillo, Km 1', 6, null, null,
   10.46500, -75.48700, null, false),

  ('Padelmania', 'Cartagena',
   'Estación Puerta de las Américas, zona norte', 2, null, null,
   10.44600, -75.50600, null, false);

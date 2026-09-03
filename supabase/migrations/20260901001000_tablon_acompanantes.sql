-- =============================================================================
-- El tablón sabe quiénes ya van.
--
-- Antes solo se guardaba cuántos cupos faltaban, así que la app no tenía idea
-- de quién era la pareja que ya iba contigo. El tablón servía para conseguir
-- gente, pero después había que volver a nombrar a los 4 al registrar el
-- partido, y si alguno no estaba registrado te enterabas al final.
--
-- Ahora la publicación lleva a los acompañantes, y los cupos se derivan solos.
-- =============================================================================

alter table public.board_posts
  add column if not exists acompanantes uuid[] not null default '{}';

comment on column public.board_posts.acompanantes is
  'Jugadores que ya van con el autor. Sin contarlo a él: máximo 2.';

alter table public.board_posts
  drop constraint if exists acompanantes_validos;

alter table public.board_posts
  add constraint acompanantes_validos check (
    cardinality(acompanantes) <= 2
    -- el autor no se acompaña a sí mismo
    and not (user_id = any (acompanantes))
    -- ni se repite un acompañante
    and (cardinality(acompanantes) < 2 or acompanantes[1] <> acompanantes[2])
  );

-- Los cupos dejan de escribirse a mano: son 4 menos el autor menos quienes ya
-- van con él. Que sea una columna generada evita que los dos datos se
-- contradigan.
alter table public.board_posts drop column if exists faltan;

alter table public.board_posts
  add column faltan smallint
  generated always as (3 - cardinality(acompanantes)) stored;

comment on column public.board_posts.faltan is
  'Derivada: cuántos jugadores hacen falta para completar los cuatro.';

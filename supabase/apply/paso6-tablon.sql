-- =============================================================================
-- TABLON: los dos cambios en orden, en un solo archivo.
--
-- Generado concatenando las migraciones. Ejecutar completo, una sola vez.
-- La fuente de verdad son los archivos de supabase/migrations/.
-- =============================================================================

-- =============================================================================
-- El tablón pasa de "qué buscas" a "cuántos faltan".
--
-- Antes había dos tipos, busco_pareja y busco_cuarto, y ninguno decía cuántos
-- cupos quedaban: quien leía no sabía si faltaba una persona o tres. Ahora se
-- guarda el número directamente, que es el dato que de verdad importa para
-- decidir si te apuntas.
-- =============================================================================

alter table public.board_posts
  add column if not exists faltan smallint not null default 1
    check (faltan between 1 and 3);

comment on column public.board_posts.faltan is
  'Cuántos jugadores se necesitan: 1 (son 3), 2 (son 2) o 3 (va solo).';

-- El tipo viejo ya no aporta nada.
alter table public.board_posts drop column if exists tipo;
drop type if exists board_tipo;

-- ---------------------------------------------------------------------------
-- Cerrar el cupo solo cuando se llena.
--
-- Antes el autor tenía que acordarse de marcarlo, y una publicación llena y
-- olvidada hace perder el tiempo a los demás.
-- ---------------------------------------------------------------------------
create or replace function public.board_cerrar_si_lleno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apuntados integer;
  v_faltan    smallint;
begin
  select count(*) into v_apuntados
    from public.board_post_signups
   where post_id = new.post_id;

  select faltan into v_faltan
    from public.board_posts
   where id = new.post_id;

  if v_apuntados >= v_faltan then
    update public.board_posts
       set estado = 'completo'
     where id = new.post_id and estado = 'abierto';
  end if;

  return new;
end;
$$;

drop trigger if exists board_signups_cerrar on public.board_post_signups;

create trigger board_signups_cerrar
  after insert on public.board_post_signups
  for each row execute function public.board_cerrar_si_lleno();

-- Si alguien se baja, la publicación vuelve a estar abierta.
create or replace function public.board_reabrir_si_falta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apuntados integer;
  v_faltan    smallint;
begin
  select count(*) into v_apuntados
    from public.board_post_signups
   where post_id = old.post_id;

  select faltan into v_faltan
    from public.board_posts
   where id = old.post_id;

  if v_apuntados < v_faltan then
    update public.board_posts
       set estado = 'abierto'
     where id = old.post_id and estado = 'completo';
  end if;

  return old;
end;
$$;

drop trigger if exists board_signups_reabrir on public.board_post_signups;

create trigger board_signups_reabrir
  after delete on public.board_post_signups
  for each row execute function public.board_reabrir_si_falta();

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

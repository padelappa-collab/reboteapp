-- =============================================================================
-- El nombre de usuario pasa a ser obligatorio.
--
-- Era opcional y eso dejaba un hueco: una cuenta privada sin usuario no se
-- podía encontrar por ningún lado, ni siquiera por quien la buscaba a
-- propósito. Con el usuario obligatorio, todo el mundo es localizable por quien
-- ya sabe a quién busca, y sigue siendo cada uno quien decide si participa en
-- la parte social o la ignora. Tener usuario no obliga a publicar nada.
--
-- Dos pasos, en este orden:
--
--   1. Se le pone uno a quien no lo tenga, derivado de su nombre. Sin esto, la
--      restricción no se puede añadir: fallaría contra las filas existentes.
--   2. Se exige de ahí en adelante.
--
-- Los usuarios derivados son un punto de partida, no una condena: cualquiera
-- puede cambiar el suyo desde su perfil.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. A quien no tiene, se le pone uno
--
-- Del nombre se quitan tildes y todo lo que no sea letra o número. Si dos
-- personas se llaman igual, al segundo se le añade un número hasta que quede
-- libre: el índice único es sobre el usuario en minúsculas, así que la
-- comprobación va en minúsculas también.
-- ---------------------------------------------------------------------------
do $BACKFILL$
declare
  v_user record;
  v_base text;
  v_cand text;
  i      integer;
begin
  for v_user in select id, nombre from public.users where username is null loop
    v_base := lower(regexp_replace(
      translate(v_user.nombre, 'áéíóúüñÁÉÍÓÚÜÑçÇ', 'aeiouunAEIOUUNcC'),
      '[^a-zA-Z0-9]', '', 'g'));
    v_base := left(v_base, 16);

    -- un nombre que al limpiarlo se queda en nada necesita algo de donde partir
    if char_length(v_base) < 3 then
      v_base := 'jugador';
    end if;

    v_cand := v_base;
    i := 0;
    while exists (
      select 1 from public.users where lower(username) = lower(v_cand)
    ) loop
      i := i + 1;
      v_cand := v_base || i::text;
    end loop;

    update public.users set username = v_cand where id = v_user.id;
    raise notice 'usuario asignado a %: %', v_user.nombre, v_cand;
  end loop;
end;
$BACKFILL$;

-- ---------------------------------------------------------------------------
-- 2. De aquí en adelante es obligatorio
-- ---------------------------------------------------------------------------
alter table public.users alter column username set not null;

alter table public.users drop constraint if exists username_valido;

alter table public.users add constraint username_valido check (
  username ~ '^[a-zA-Z0-9_.]+$'
  and char_length(username) between 3 and 20
);

comment on column public.users.username is
  'Único y obligatorio. El nombre real no es único: dos jugadores pueden '
  'llamarse igual, y es con esto con lo que se distinguen en los buscadores.';

-- ---------------------------------------------------------------------------
-- 3. La bienvenida ya no pide lo que ahora se pide al registrarse
-- ---------------------------------------------------------------------------
create or replace function public.avisar_bienvenida()
returns trigger
language plpgsql
security definer
set search_path = public
as $FN$
begin
  perform public.avisar(
    new.id, 'bienvenida',
    '¡Bienvenido a REBOTEAPP!',
    'Registra tu primer partido para que arranque tu ELO. Y cuando quieras, '
    || 'pásate por Social: con tu usuario @' || new.username || ' ya pueden '
    || 'encontrarte y seguirte.',
    '/partidos/nuevo', null, new.id
  );
  return new;
end;
$FN$;

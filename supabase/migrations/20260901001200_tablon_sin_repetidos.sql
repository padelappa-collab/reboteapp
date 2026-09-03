-- =============================================================================
-- Nadie puede ocupar dos veces el mismo cupo.
--
-- La llave primaria ya impedía apuntarse dos veces, pero no que se apuntara
-- quien ya iba: el autor de la publicación o alguno de sus acompañantes. Si eso
-- pasaba, la publicación mostraba a la misma persona dos veces y el partido que
-- salía de ahí llegaba con jugadores repetidos.
-- =============================================================================

create or replace function public.board_signup_valido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.board_posts;
begin
  select * into v_post from public.board_posts where id = new.post_id;

  if v_post.id is null then
    raise exception 'La publicación no existe';
  end if;

  if new.user_id = v_post.user_id then
    raise exception 'Quien publica ya está en el partido';
  end if;

  if new.user_id = any (v_post.acompanantes) then
    raise exception 'Ese jugador ya iba en el partido';
  end if;

  return new;
end;
$$;

drop trigger if exists board_signups_validar on public.board_post_signups;

create trigger board_signups_validar
  before insert on public.board_post_signups
  for each row execute function public.board_signup_valido();

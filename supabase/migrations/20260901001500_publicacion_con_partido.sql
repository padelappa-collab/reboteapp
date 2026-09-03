-- =============================================================================
-- La publicación recuerda qué partido salió de ella.
--
-- Sin este enlace, el tablón seguía ofreciendo "salirme del partido" incluso
-- después de que el resultado ya estaba registrado, cuando salirse ya no
-- significa nada: el partido existe con esos cuatro jugadores y lo que toca es
-- confirmarlo o salirse desde su propia ficha.
-- =============================================================================

alter table public.board_posts
  add column if not exists match_id uuid
    references public.matches (id) on delete set null;

comment on column public.board_posts.match_id is
  'El partido que se registró desde esta publicación, si ya se registró.';

-- Cualquiera de los cuatro puede registrar el partido, no solo quien publicó,
-- así que el enlace no puede depender de la política de escritura del autor.
create or replace function public.vincular_partido(p_post_id uuid, p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post  public.board_posts;
  v_match public.matches;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_post from public.board_posts where id = p_post_id for update;
  select * into v_match from public.matches where id = p_match_id;

  if v_post.id is null or v_match.id is null then
    raise exception 'La publicación o el partido no existen';
  end if;

  -- quien enlaza tiene que estar en el partido
  if not (v_uid = any (v_match.pareja_a || v_match.pareja_b)) then
    raise exception 'Solo los jugadores del partido pueden enlazarlo';
  end if;

  -- y tiene que estar también en la publicación
  if not (
    v_uid = v_post.user_id
    or v_uid = any (v_post.acompanantes)
    or exists (
      select 1 from public.board_post_signups
       where post_id = p_post_id and user_id = v_uid
    )
  ) then
    raise exception 'No estás en esta publicación';
  end if;

  update public.board_posts
     set match_id = p_match_id,
         estado = 'completo'
   where id = p_post_id;
end;
$$;

revoke execute on function public.vincular_partido(uuid, uuid) from anon;

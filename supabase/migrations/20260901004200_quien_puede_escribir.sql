-- =============================================================================
-- A quién se le puede escribir.
--
-- La regla era "alguno de los dos sigue al otro", y dejaba pasar un caso que no
-- debería: alguien con la cuenta privada que te sigue podía escribirte aunque tú
-- no lo siguieras ni pudieras ver nada suyo. Seguir a alguien no es pedirle
-- permiso para que te escriba.
--
-- La regla nueva es la que se entiende sin explicarla:
--
--   · A quien tú sigues. Lo elegiste, así que el buzón está abierto.
--   · A cualquier cuenta pública. Es lo que significa ser pública: cualquiera
--     puede verte y hablarte.
--
-- Una cuenta privada que no sigues no recibe nada tuyo, y eso es justo lo que
-- protege a quien se puso en privado.
-- =============================================================================

create or replace function public.conversacion_con(p_usuario uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_clave text;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  if v_uid = p_usuario then
    raise exception 'No puedes escribirte a ti mismo';
  end if;

  if not exists (
    select 1 from public.users u
     where u.id = p_usuario
       and (
         -- su cuenta es pública
         not u.cuenta_privada
         -- o tú lo sigues
         or exists (
           select 1 from public.follows f
            where f.follower_id = v_uid
              and f.followed_id = p_usuario
              and f.estado = 'aceptado'
         )
       )
  ) then
    raise exception 'Solo puedes escribirle a quien sigues o a cuentas públicas';
  end if;

  v_clave := least(v_uid::text, p_usuario::text) || ':' ||
             greatest(v_uid::text, p_usuario::text);

  select id into v_id from public.conversations where clave = v_clave;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (es_grupal, clave)
  values (false, v_clave)
  on conflict (clave) do nothing
  returning id into v_id;

  -- si dos mensajes salieron a la vez, el índice único dejó pasar solo uno y
  -- aquí se recoge el que ganó
  if v_id is null then
    select id into v_id from public.conversations where clave = v_clave;
    return v_id;
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_id, v_uid), (v_id, p_usuario);

  return v_id;
end;
$$;

revoke execute on function public.conversacion_con(uuid) from anon;
grant execute on function public.conversacion_con(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- La lista de compartir, con la misma regla.
--
-- Antes ofrecía a todo el que te sigue. Ahora quien te sigue solo sale si su
-- cuenta es pública o si tú también lo sigues: enseñar a alguien a quien la base
-- va a rechazar es prometer algo que falla al pulsarlo.
-- ---------------------------------------------------------------------------
create or replace function public.gente_para_compartir()
returns table (
  user_id  uuid,
  nombre   text,
  username text,
  foto_url text,
  mutuo    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (select auth.uid() as id),
  sigo as (
    select followed_id as id from public.follows, yo
     where follower_id = yo.id and estado = 'aceptado'
  ),
  siguen as (
    select follower_id as id from public.follows, yo
     where followed_id = yo.id and estado = 'aceptado'
  ),
  todos as (
    select id, true as mutuo from sigo where id in (select id from siguen)
    union
    select id, false from sigo where id not in (select id from siguen)
    union
    -- de los que te siguen, solo los públicos: a los privados que no sigues no
    -- se les puede escribir
    select s.id, false
      from siguen s
      join public.users u on u.id = s.id
     where s.id not in (select id from sigo)
       and not u.cuenta_privada
  )
  select u.id, u.nombre, u.username, u.foto_url, t.mutuo
    from todos t
    join public.users u on u.id = t.id
   order by t.mutuo desc, u.nombre;
$$;

revoke execute on function public.gente_para_compartir() from anon;
grant execute on function public.gente_para_compartir() to authenticated;

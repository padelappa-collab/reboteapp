-- Que borrar una cuenta no sea imposible.
--
-- Al borrar un jugador, la cascada borra sus inscripciones del tablon y sus
-- parejas de torneo. Eso despierta a los disparadores que anuncian "fulano se
-- salio de tu partido", que intentan escribir un aviso senalando como autor a
-- alguien que en ese preciso instante ya no existe. La clave foranea lo
-- rechaza, la cascada entera se cae, y el panel de Supabase solo dice
-- "Database error deleting user" sin explicar nada.
--
-- Se arregla aqui y no en cada disparador porque todos los avisos pasan por
-- esta funcion: asi queda cubierto tambien lo que se anada mas adelante.
--
-- Dos comprobaciones, con sentido propio mas alla de no romperse:
--
--   . Si el destinatario ya no existe, no hay a quien avisar.
--   . Si el autor ya no existe, el aviso se guarda sin autor. La cuenta se
--     borro; el hecho paso igual y quien lo recibe merece enterarse, solo que
--     ya no hay perfil al que enlazar.

create or replace function public.avisar(
  p_user uuid, p_tipo text, p_titulo text,
  p_cuerpo text default null, p_enlace text default null,
  p_actor uuid default null, p_entidad uuid default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor uuid := p_actor;
begin
  -- nadie necesita que le avisen de lo que acaba de hacer
  if p_user is null or p_user = p_actor then
    return;
  end if;

  if not exists (select 1 from public.users where id = p_user) then
    return;
  end if;

  if v_actor is not null
     and not exists (select 1 from public.users where id = v_actor) then
    v_actor := null;
  end if;

  insert into public.notifications
    (user_id, tipo, titulo, cuerpo, enlace, actor_id, entidad_id)
  values
    (p_user, p_tipo, p_titulo, p_cuerpo, p_enlace, v_actor, p_entidad)
  on conflict do nothing;
end;
$$;

revoke execute on function public.avisar(uuid,text,text,text,text,uuid,uuid)
  from public, anon, authenticated;

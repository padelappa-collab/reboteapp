-- Cuando algo se borra, se borra entero.
--
-- Las notificaciones guardan a qué apuntan en `entidad_id`, un uuid suelto sin
-- clave foránea: no puede tenerla porque apunta a tablas distintas según el
-- tipo. El precio es que nadie las borra cuando desaparece aquello de lo que
-- hablaban, y quedan avisos de "le gustó tu publicación" que llevan a una
-- pantalla vacía. Basura que además le recuerda a la persona algo que decidió
-- borrar.

create or replace function public.borrar_rastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications where entidad_id = old.id;
  return old;
end;
$$;

revoke execute on function public.borrar_rastro() from public, anon, authenticated;

drop trigger if exists rastro_publicacion on public.feed_posts;
create trigger rastro_publicacion
  after delete on public.feed_posts
  for each row execute function public.borrar_rastro();

drop trigger if exists rastro_historia on public.stories;
create trigger rastro_historia
  after delete on public.stories
  for each row execute function public.borrar_rastro();

drop trigger if exists rastro_tablon on public.board_posts;
create trigger rastro_tablon
  after delete on public.board_posts
  for each row execute function public.borrar_rastro();

drop trigger if exists rastro_torneo on public.tournaments;
create trigger rastro_torneo
  after delete on public.tournaments
  for each row execute function public.borrar_rastro();

delete from public.notifications n
where n.entidad_id is not null
  and not exists (select 1 from public.feed_posts    where id = n.entidad_id)
  and not exists (select 1 from public.stories       where id = n.entidad_id)
  and not exists (select 1 from public.matches       where id = n.entidad_id)
  and not exists (select 1 from public.board_posts   where id = n.entidad_id)
  and not exists (select 1 from public.tournaments   where id = n.entidad_id)
  and not exists (select 1 from public.users         where id = n.entidad_id)
  and not exists (select 1 from public.conversations where id = n.entidad_id);

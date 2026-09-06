-- =============================================================================
-- Vídeo en las historias.
--
-- El archivo no se guarda aquí: vive en Cloudflare Stream y de él solo queda un
-- identificador de texto. Así el vídeo no consume ni el gigabyte de
-- almacenamiento del proyecto ni su cuota de tráfico —que es la misma que sirve
-- el ranking y los partidos, y agotarla con un vídeo popular dejaría la app
-- entera a medio gas—.
--
-- El tope de 30 segundos lo aplica Cloudflare al pedir la subida, no el
-- cliente: una comprobación en el teléfono avisa rápido, pero se salta.
-- =============================================================================

alter table public.stories add column if not exists video_uid text;
alter table public.stories alter column imagen_url drop not null;

alter table public.stories drop constraint if exists historia_con_algo;
alter table public.stories add constraint historia_con_algo
  check (imagen_url is not null or video_uid is not null);

drop function if exists public.historias_de(uuid);

create function public.historias_de(p_usuario uuid)
returns table (
  id         uuid,
  imagen_url text,
  video_uid  text,
  created_at timestamptz,
  visto      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.imagen_url, s.video_uid, s.created_at,
         v.story_id is not null
    from public.stories s
    left join public.story_views v
           on v.story_id = s.id and v.viewer_id = auth.uid()
   where s.user_id = p_usuario
     and s.expira_at > now()
     and (p_usuario = auth.uid() or public.puede_ver_feed_de(p_usuario))
   order by s.created_at;
$$;

revoke execute on function public.historias_de(uuid) from public, anon;
grant execute on function public.historias_de(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- El limpiador también borra el vídeo en Cloudflare.
--
-- Y lo hace ANTES de borrar la fila: si se borra primero, el identificador se
-- pierde y el vídeo se queda allí para siempre ocupando minutos que se pagan.
-- Es el mismo camino del push: la base llama a la función por HTTP.
-- ---------------------------------------------------------------------------
create or replace function public.limpiar_historias()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borradas integer;
  v_uid      text;
begin
  for v_uid in
    select video_uid from public.stories
     where expira_at <= now() and video_uid is not null
  loop
    perform net.http_post(
      url := 'https://rflqogmivuwqqzpyrilm.supabase.co/functions/v1/video',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'sb_publishable_F3Iv0GXE0QiNnZuiee-FZA_gI51a0el',
        'Authorization', 'Bearer sb_publishable_F3Iv0GXE0QiNnZuiee-FZA_gI51a0el'
      ),
      body := jsonb_build_object('accion', 'borrar', 'uid', v_uid));
  end loop;

  delete from public.stories where expira_at <= now();
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

revoke execute on function public.limpiar_historias() from public, anon, authenticated;

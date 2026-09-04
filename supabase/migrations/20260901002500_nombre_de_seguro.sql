-- =============================================================================
-- nombre_de() nunca puede devolver NULL.
--
-- Los títulos de los avisos se arman concatenando el nombre de quien provocó el
-- evento. Si ese nombre viene NULL, el título entero se vuelve NULL y el insert
-- falla contra un NOT NULL, tumbando el trigger y con él la operación que lo
-- disparó: alguien no podría cancelar un partido porque el aviso no se pudo
-- redactar.
--
-- Pasa con cualquier referencia que admita NULL, como matches.cancelado_por.
-- =============================================================================

create or replace function public.nombre_de(p_user uuid)
returns text
language sql
stable
as $$
  select coalesce(
    (select nombre from public.users where id = p_user),
    'Alguien'
  );
$$;

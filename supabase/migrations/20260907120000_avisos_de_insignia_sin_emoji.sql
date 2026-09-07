-- Quitar el emoji del aviso de insignia.
--
-- Las insignias se dibujan con glifos propios desde que se decidio no usar
-- emoji en la interfaz: cada sistema los pinta con su propia fuente y ninguno
-- casa con el grosor de trazo del resto. Pero el aviso seguia armando su titulo
-- con `badges.icono`, que guarda el emoji viejo, asi que la pantalla de
-- novedades --y el push, que es donde mas se nota-- mostraba
-- "* Ganaste la insignia Fundador" con la estrella de emoji delante.
--
-- La columna `icono` se queda: no la lee nadie mas --la rejilla de insignias
-- usa BadgeGlyph-- y borrarla obligaria a tocar las 30 filas del catalogo sin
-- ganar nada.

create or replace function public.avisar_insignia()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_badge public.badges;
begin
  select * into v_badge from public.badges where id = new.badge_id;

  perform public.avisar(
    new.user_id, 'insignia',
    'Ganaste la insignia ' || v_badge.nombre,
    v_badge.descripcion,
    '/perfil', null, null
  );
  return new;
end;
$$;

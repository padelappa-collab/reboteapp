-- =============================================================================
-- El push también tiene que salir cuando el aviso se actualiza.
--
-- Los avisos que se agrupan —mensajes de una conversación, me gusta de una
-- historia— no crean una fila por evento: crean una y la van actualizando. Eso
-- es lo que evita quince notificaciones por quince mensajes.
--
-- Pero `notifications_push` estaba solo sobre INSERT, así que sonaba el primero
-- de la serie y ninguno más. El síntoma era desconcertante: llegaba el aviso de
-- la publicación compartida —que abría la conversación— y después ni uno solo
-- de los mensajes escritos.
--
-- Hacen falta dos triggers y no uno con `after insert or update`, porque la
-- condición del UPDATE necesita mirar OLD y Postgres no permite referenciar OLD
-- en un WHEN que también cubra inserciones.
-- =============================================================================

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.disparar_push();

-- Solo cuando el aviso se refresca de verdad: `created_at` cambia únicamente en
-- los avisos agrupados al llegar algo nuevo. Marcar como leído no lo toca, así
-- que abrir la campana no vuelve a hacer sonar el teléfono.
drop trigger if exists notifications_push_refrescado on public.notifications;
create trigger notifications_push_refrescado
  after update on public.notifications
  for each row
  when (new.leida = false and new.created_at is distinct from old.created_at)
  execute function public.disparar_push();

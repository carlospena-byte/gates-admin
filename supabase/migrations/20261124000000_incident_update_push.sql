-- gates-admin: tell the reporter when their incident's status OR priority
-- changes, in the app inbox and as a push.
--
-- Replaces notify_incident_status (status only, inbox only). One trigger on
-- the table covers every path that edits an incident (admin table, board,
-- detail sheet, bulk resolve, inbox). The push is delivered by the
-- send-incident-notification edge function through pg_net, authenticated with
-- the Vault secrets `project_url` / `service_role_key` (same as the scheduled
-- push dispatcher). If they are missing the inbox row is still written.

create extension if not exists pg_net;

create or replace function public.notify_incident_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_changed boolean;
  v_priority_changed boolean;
  v_status_text text;
  v_priority_text text;
  v_body text;
  v_title text := 'Actualización de tu reporte';
  v_data jsonb;
  base_url text;
  service_key text;
begin
  if new.reported_by is null or auth.uid() is not distinct from new.reported_by then
    return new;
  end if;

  -- Moving back to 'new' is not news for the reporter.
  v_status_changed := new.status is distinct from old.status and new.status <> 'new';
  v_priority_changed := new.priority is distinct from old.priority;
  if not v_status_changed and not v_priority_changed then
    return new;
  end if;

  v_status_text := case new.status
    when 'in_progress' then 'en proceso'
    when 'resolved' then 'resuelto'
    when 'cancelled' then 'cancelado'
    else 'cerrado'
  end;
  v_priority_text := case new.priority
    when 'low' then 'baja'
    when 'medium' then 'media'
    when 'high' then 'alta'
    else 'urgente'
  end;

  v_body := case
    when v_status_changed and v_priority_changed then
      format('"%s" ahora está %s con prioridad %s.', new.title, v_status_text, v_priority_text)
    when v_status_changed then
      format('"%s" ahora está %s.', new.title, v_status_text)
    else
      format('La prioridad de "%s" cambió a %s.', new.title, v_priority_text)
  end;

  v_data := jsonb_build_object(
    'type', 'incident',
    'incident_id', new.id,
    'residential_id', new.residential_id
  );

  insert into public.user_notifications (user_id, residential_id, type, title, body, data)
  values (new.reported_by, new.residential_id, 'incident', v_title, v_body, v_data);

  -- Push is best effort: it must never block or fail the incident update.
  begin
    select decrypted_secret into base_url
      from vault.decrypted_secrets where name = 'project_url';
    select decrypted_secret into service_key
      from vault.decrypted_secrets where name = 'service_role_key';

    if base_url is null or service_key is null then
      raise warning 'incident push skipped: vault secrets project_url/service_role_key are not set';
    else
      perform net.http_post(
        url := base_url || '/functions/v1/send-incident-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'userId', new.reported_by,
          'title', v_title,
          'body', v_body,
          'data', v_data
        )
      );
    end if;
  exception when others then
    raise warning 'incident push failed: %', sqlerrm;
  end;

  return new;
end;
$$;

alter function public.notify_incident_update() owner to postgres;

drop trigger if exists notify_incident_status on public.incidents;
drop function if exists public.notify_incident_status();

drop trigger if exists notify_incident_update on public.incidents;
create trigger notify_incident_update after update of status, priority on public.incidents
for each row execute function public.notify_incident_update();

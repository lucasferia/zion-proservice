begin;

alter table public.maintenance_requests
  add column technical_priority text,
  add column public_response text,
  add column internal_decision_note text,
  add column decided_at timestamptz,
  add column decided_by uuid references auth.users (id) on delete restrict,
  add column converted_at timestamptz,
  add column converted_by uuid references auth.users (id) on delete restrict;

alter table public.maintenance_requests
  add constraint maintenance_requests_technical_priority_check
    check (technical_priority is null or technical_priority in ('low', 'medium', 'high', 'critical')),
  add constraint maintenance_requests_public_response_check
    check (public_response is null or char_length(btrim(public_response)) between 3 and 2000),
  add constraint maintenance_requests_internal_note_check
    check (internal_decision_note is null or char_length(btrim(internal_decision_note)) between 3 and 3000),
  add constraint maintenance_requests_decision_audit_check check (
    (status in ('pending', 'cancelled') and technical_priority is null and public_response is null
      and internal_decision_note is null and decided_at is null and decided_by is null
      and converted_at is null and converted_by is null)
    or
    (status = 'approved' and technical_priority is not null and decided_at is not null and decided_by is not null
      and converted_at is null and converted_by is null)
    or
    (status = 'rejected' and public_response is not null and decided_at is not null and decided_by is not null
      and converted_at is null and converted_by is null)
    or
    (status = 'converted' and technical_priority is not null and decided_at is not null and decided_by is not null
      and converted_at is not null and converted_by is not null)
  );

create table public.maintenance_request_conversions (
  organization_id uuid not null references public.organizations (id) on delete restrict,
  maintenance_request_id uuid primary key,
  maintenance_id uuid not null unique,
  converted_at timestamptz not null default now(),
  converted_by uuid not null references auth.users (id) on delete restrict,
  constraint maintenance_request_conversions_request_fk
    foreign key (maintenance_request_id, organization_id)
    references public.maintenance_requests (id, organization_id) on delete restrict,
  constraint maintenance_request_conversions_maintenance_fk
    foreign key (maintenance_id, organization_id)
    references public.maintenances (id, organization_id) on delete restrict
);

alter table public.maintenance_request_conversions enable row level security;

create or replace function public.is_internal_maintenance_request_owner(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and not exists (
      select 1 from public.academy_portal_users portal_users where portal_users.user_id = auth.uid()
    )
    and exists (
      select 1 from public.organization_members members
      where members.organization_id = target_organization_id and members.user_id = auth.uid()
        and members.role = 'owner' and members.status = 'active'
    );
$$;

create policy maintenance_request_conversions_select_internal
  on public.maintenance_request_conversions for select to authenticated
  using (public.is_internal_maintenance_request_member(organization_id));

revoke all on table public.maintenance_request_conversions from public, anon, authenticated;
grant select on table public.maintenance_request_conversions to service_role;

drop trigger maintenance_requests_guard on public.maintenance_requests;
create or replace function public.guard_maintenance_request_records()
returns trigger language plpgsql set search_path = '' as $$
declare internal_transition boolean := coalesce(current_setting('zion.maintenance_request_transition', true), '') = 'allowed';
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'Solicitacoes de manutencao nao podem ser excluidas.';
  end if;
  if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id
    or new.client_id is distinct from old.client_id or new.client_location_id is distinct from old.client_location_id
    or new.equipment_id is distinct from old.equipment_id or new.requested_by is distinct from old.requested_by
    or new.submission_key is distinct from old.submission_key or new.title is distinct from old.title
    or new.description is distinct from old.description or new.reported_criticality is distinct from old.reported_criticality
    or new.origin is distinct from old.origin or new.created_at is distinct from old.created_at
  then raise exception using errcode = '42501', message = 'A solicitacao enviada e imutavel.'; end if;

  if internal_transition then
    if not ((old.status = 'pending' and new.status in ('approved', 'rejected'))
      or (old.status = 'approved' and new.status = 'converted')) then
      raise exception using errcode = '42501', message = 'Transicao interna invalida.';
    end if;
    if new.cancellation_reason is distinct from old.cancellation_reason
      or new.cancelled_at is distinct from old.cancelled_at or new.cancelled_by is distinct from old.cancelled_by
    then raise exception using errcode = '42501', message = 'A auditoria de cancelamento e protegida.'; end if;
  else
    if old.status <> 'pending' or new.status <> 'cancelled'
      or new.technical_priority is distinct from old.technical_priority
      or new.public_response is distinct from old.public_response
      or new.internal_decision_note is distinct from old.internal_decision_note
      or new.decided_at is distinct from old.decided_at or new.decided_by is distinct from old.decided_by
      or new.converted_at is distinct from old.converted_at or new.converted_by is distinct from old.converted_by
    then raise exception using errcode = '42501', message = 'A solicitacao enviada e imutavel.'; end if;
  end if;
  return new;
end;
$$;
create trigger maintenance_requests_guard before update or delete on public.maintenance_requests
for each row execute function public.guard_maintenance_request_records();

alter table public.maintenance_request_events drop constraint maintenance_request_events_action_check;
alter table public.maintenance_request_events add constraint maintenance_request_events_action_check
  check (action in ('request_created', 'photo_added', 'photo_removed', 'request_cancelled', 'request_approved', 'request_rejected', 'request_converted'));
create unique index maintenance_request_events_approved_once_uidx on public.maintenance_request_events (maintenance_request_id) where action = 'request_approved';
create unique index maintenance_request_events_rejected_once_uidx on public.maintenance_request_events (maintenance_request_id) where action = 'request_rejected';
create unique index maintenance_request_events_converted_once_uidx on public.maintenance_request_events (maintenance_request_id) where action = 'request_converted';

create or replace function public.internal_approve_maintenance_request(
  target_organization_id uuid, target_request_id uuid, target_priority text,
  response_to_academy text default null, decision_note text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_request public.maintenance_requests%rowtype;
  normalized_response text := nullif(btrim(coalesce(response_to_academy, '')), '');
  normalized_note text := nullif(btrim(coalesce(decision_note, '')), '');
begin
  if not public.is_internal_maintenance_request_owner(target_organization_id) then raise exception using errcode='42501',message='Somente um owner pode aprovar solicitacoes.'; end if;
  if target_priority not in ('low','medium','high','critical') then raise exception using errcode='22023',message='Informe uma prioridade tecnica valida.'; end if;
  if normalized_response is not null and char_length(normalized_response) not between 3 and 2000 then raise exception using errcode='22023',message='A resposta publica deve ter entre 3 e 2000 caracteres.'; end if;
  if normalized_note is not null and char_length(normalized_note) not between 3 and 3000 then raise exception using errcode='22023',message='A nota interna deve ter entre 3 e 3000 caracteres.'; end if;
  select * into current_request from public.maintenance_requests where id=target_request_id and organization_id=target_organization_id for update;
  if not found then raise exception using errcode='P0002',message='Solicitacao nao encontrada.'; end if;
  if current_request.status='approved' then
    if current_request.technical_priority=target_priority and current_request.public_response is not distinct from normalized_response and current_request.internal_decision_note is not distinct from normalized_note then return; end if;
    raise exception using errcode='PT409',message='A solicitacao ja foi aprovada com dados diferentes.';
  end if;
  if current_request.status<>'pending' then raise exception using errcode='PT409',message='Somente solicitacoes pendentes podem ser aprovadas.'; end if;
  perform set_config('zion.maintenance_request_transition','allowed',true);
  update public.maintenance_requests set status='approved',technical_priority=target_priority,public_response=normalized_response,
    internal_decision_note=normalized_note,decided_at=now(),decided_by=actor,updated_at=now() where id=target_request_id;
  insert into public.maintenance_request_events(organization_id,maintenance_request_id,action,actor_id,details)
    values(target_organization_id,target_request_id,'request_approved',actor,jsonb_build_object('technical_priority',target_priority));
end;
$$;

create or replace function public.internal_reject_maintenance_request(
  target_organization_id uuid, target_request_id uuid, response_to_academy text, decision_note text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_request public.maintenance_requests%rowtype;
  normalized_response text := btrim(coalesce(response_to_academy, ''));
  normalized_note text := nullif(btrim(coalesce(decision_note, '')), '');
begin
  if not public.is_internal_maintenance_request_owner(target_organization_id) then raise exception using errcode='42501',message='Somente um owner pode rejeitar solicitacoes.'; end if;
  if char_length(normalized_response) not between 3 and 2000 then raise exception using errcode='22023',message='Informe ao solicitante um motivo entre 3 e 2000 caracteres.'; end if;
  if normalized_note is not null and char_length(normalized_note) not between 3 and 3000 then raise exception using errcode='22023',message='A nota interna deve ter entre 3 e 3000 caracteres.'; end if;
  select * into current_request from public.maintenance_requests where id=target_request_id and organization_id=target_organization_id for update;
  if not found then raise exception using errcode='P0002',message='Solicitacao nao encontrada.'; end if;
  if current_request.status='rejected' then
    if current_request.public_response=normalized_response and current_request.internal_decision_note is not distinct from normalized_note then return; end if;
    raise exception using errcode='PT409',message='A solicitacao ja foi rejeitada com dados diferentes.';
  end if;
  if current_request.status<>'pending' then raise exception using errcode='PT409',message='Somente solicitacoes pendentes podem ser rejeitadas.'; end if;
  perform set_config('zion.maintenance_request_transition','allowed',true);
  update public.maintenance_requests set status='rejected',public_response=normalized_response,internal_decision_note=normalized_note,
    decided_at=now(),decided_by=actor,updated_at=now() where id=target_request_id;
  insert into public.maintenance_request_events(organization_id,maintenance_request_id,action,actor_id,details)
    values(target_organization_id,target_request_id,'request_rejected',actor,'{}'::jsonb);
end;
$$;

create or replace function public.internal_convert_maintenance_request(
  target_organization_id uuid, target_request_id uuid, target_maintenance_type text,
  target_scheduled_at timestamptz, target_responsible_technician_id uuid
) returns table(maintenance_id uuid, work_order_number text)
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); request_record public.maintenance_requests%rowtype; existing record; new_maintenance_id uuid; new_number text;
begin
  if not public.is_internal_maintenance_request_owner(target_organization_id) then raise exception using errcode='42501',message='Somente um owner pode converter solicitacoes.'; end if;
  if target_maintenance_type not in ('preventive','corrective') or target_scheduled_at is null then raise exception using errcode='22023',message='Informe tipo e data do atendimento.'; end if;
  select * into request_record from public.maintenance_requests where id=target_request_id and organization_id=target_organization_id for update;
  if not found then raise exception using errcode='P0002',message='Solicitacao nao encontrada.'; end if;
  if request_record.status='converted' then
    select c.maintenance_id,m.work_order_number,m.maintenance_type,m.scheduled_at,m.responsible_technician_id into existing
    from public.maintenance_request_conversions c join public.maintenances m on m.id=c.maintenance_id and m.organization_id=c.organization_id
    where c.organization_id=target_organization_id and c.maintenance_request_id=target_request_id;
    if existing.maintenance_type=target_maintenance_type and existing.scheduled_at=target_scheduled_at and existing.responsible_technician_id=target_responsible_technician_id then
      return query select existing.maintenance_id,existing.work_order_number; return;
    end if;
    raise exception using errcode='PT409',message='A solicitacao ja foi convertida com dados diferentes.';
  end if;
  if request_record.status<>'approved' then raise exception using errcode='PT409',message='Somente solicitacoes aprovadas podem ser convertidas.'; end if;
  if not exists(select 1 from public.clients c where c.id=request_record.client_id and c.organization_id=target_organization_id and c.deleted_at is null)
    or not exists(select 1 from public.client_locations l where l.id=request_record.client_location_id and l.client_id=request_record.client_id and l.organization_id=target_organization_id and l.deleted_at is null)
    or not exists(select 1 from public.equipment e where e.id=request_record.equipment_id and e.client_id=request_record.client_id and e.client_location_id=request_record.client_location_id and e.organization_id=target_organization_id and e.deleted_at is null and e.status<>'inactive')
  then raise exception using errcode='55000',message='Cliente, unidade ou equipamento nao esta mais elegivel para conversao.'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=target_organization_id and m.user_id=target_responsible_technician_id and m.status='active' and m.role in ('owner','technician'))
  then raise exception using errcode='23514',message='Selecione um tecnico ativo da organizacao.'; end if;
  insert into public.maintenances(organization_id,client_id,client_location_id,equipment_id,maintenance_type,status,scheduled_at,responsible_technician_id,created_by,updated_by)
    values(target_organization_id,request_record.client_id,request_record.client_location_id,request_record.equipment_id,target_maintenance_type,'draft',target_scheduled_at,target_responsible_technician_id,actor,actor)
    returning id,maintenances.work_order_number into new_maintenance_id,new_number;
  insert into public.maintenance_request_conversions(organization_id,maintenance_request_id,maintenance_id,converted_by)
    values(target_organization_id,target_request_id,new_maintenance_id,actor);
  perform set_config('zion.maintenance_request_transition','allowed',true);
  update public.maintenance_requests set status='converted',converted_at=now(),converted_by=actor,updated_at=now() where id=target_request_id;
  insert into public.maintenance_request_events(organization_id,maintenance_request_id,action,actor_id,details)
    values(target_organization_id,target_request_id,'request_converted',actor,jsonb_build_object('maintenance_id',new_maintenance_id));
  return query select new_maintenance_id,new_number;
end;
$$;

drop function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer);
create function public.portal_list_maintenance_requests(target_client_location_id uuid,search_term text default null,filter_status text default null,filter_criticality text default null,page_number integer default 1,page_size integer default 12)
returns table(id uuid,title text,description text,reported_criticality text,status text,equipment_id uuid,equipment_name text,created_at timestamptz,technical_priority text,public_response text,decided_at timestamptz,converted_at timestamptz,work_order_number text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); scope_record record; q text:=nullif(btrim(coalesce(search_term,'')),''); p int:=greatest(coalesce(page_number,1),1); s int:=least(greatest(coalesce(page_size,12),1),50);
begin
  select * into scope_record from public.current_academy_request_scope(target_client_location_id);
  return query select r.id,r.title,r.description,r.reported_criticality,r.status,r.equipment_id,e.name,r.created_at,r.technical_priority,r.public_response,r.decided_at,r.converted_at,m.work_order_number,count(*) over()::bigint
  from public.maintenance_requests r join public.equipment e on e.id=r.equipment_id and e.organization_id=r.organization_id
  left join public.maintenance_request_conversions x on x.maintenance_request_id=r.id and x.organization_id=r.organization_id
  left join public.maintenances m on m.id=x.maintenance_id and m.organization_id=x.organization_id
  where r.organization_id=scope_record.organization_id and r.client_id=scope_record.client_id and r.client_location_id=scope_record.client_location_id and r.requested_by=actor_id
    and (q is null or r.title ilike '%'||q||'%' or e.name ilike '%'||q||'%') and (nullif(filter_status,'') is null or r.status=filter_status) and (nullif(filter_criticality,'') is null or r.reported_criticality=filter_criticality)
  order by r.created_at desc,r.id limit s offset (p-1)*s;
end; $$;

drop function public.portal_get_maintenance_request(uuid,uuid);
create function public.portal_get_maintenance_request(target_client_location_id uuid,target_request_id uuid)
returns table(id uuid,title text,description text,reported_criticality text,status text,equipment_id uuid,equipment_name text,equipment_category text,location_name text,created_at timestamptz,cancellation_reason text,cancelled_at timestamptz,technical_priority text,public_response text,decided_at timestamptz,converted_at timestamptz,work_order_number text)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); scope_record record;
begin
  select * into scope_record from public.current_academy_request_scope(target_client_location_id);
  return query select r.id,r.title,r.description,r.reported_criticality,r.status,r.equipment_id,e.name,e.category,scope_record.location_name,r.created_at,r.cancellation_reason,r.cancelled_at,r.technical_priority,r.public_response,r.decided_at,r.converted_at,m.work_order_number
  from public.maintenance_requests r join public.equipment e on e.id=r.equipment_id and e.organization_id=r.organization_id
  left join public.maintenance_request_conversions x on x.maintenance_request_id=r.id and x.organization_id=r.organization_id left join public.maintenances m on m.id=x.maintenance_id and m.organization_id=x.organization_id
  where r.id=target_request_id and r.organization_id=scope_record.organization_id and r.client_id=scope_record.client_id and r.client_location_id=scope_record.client_location_id and r.requested_by=actor_id;
end; $$;

drop function public.internal_list_maintenance_requests(uuid,text,text,text,integer,integer);
create function public.internal_list_maintenance_requests(target_organization_id uuid,search_term text default null,filter_status text default null,filter_criticality text default null,page_number integer default 1,page_size integer default 20)
returns table(id uuid,title text,description text,reported_criticality text,status text,equipment_name text,client_name text,location_name text,requester_name text,created_at timestamptz,technical_priority text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare q text:=nullif(btrim(coalesce(search_term,'')),''); p int:=greatest(coalesce(page_number,1),1); s int:=least(greatest(coalesce(page_size,20),1),50);
begin
  if not public.is_internal_maintenance_request_member(target_organization_id) then raise exception using errcode='42501',message='Acesso negado.'; end if;
  return query select r.id,r.title,r.description,r.reported_criticality,r.status,e.name,c.name,l.name,profiles.full_name,r.created_at,r.technical_priority,count(*) over()::bigint
  from public.maintenance_requests r join public.equipment e on e.id=r.equipment_id and e.organization_id=r.organization_id join public.clients c on c.id=r.client_id and c.organization_id=r.organization_id join public.client_locations l on l.id=r.client_location_id and l.organization_id=r.organization_id join public.profiles on profiles.id=r.requested_by
  where r.organization_id=target_organization_id and (q is null or r.title ilike '%'||q||'%' or e.name ilike '%'||q||'%' or c.name ilike '%'||q||'%') and (nullif(filter_status,'') is null or r.status=filter_status) and (nullif(filter_criticality,'') is null or r.reported_criticality=filter_criticality)
  order by r.created_at desc,r.id limit s offset (p-1)*s;
end; $$;

drop function public.internal_get_maintenance_request(uuid,uuid);
create function public.internal_get_maintenance_request(target_organization_id uuid,target_request_id uuid)
returns table(id uuid,title text,description text,reported_criticality text,status text,equipment_id uuid,equipment_name text,equipment_category text,client_name text,location_name text,requester_name text,requester_email text,created_at timestamptz,cancellation_reason text,cancelled_at timestamptz,technical_priority text,public_response text,internal_decision_note text,decided_at timestamptz,decided_by_name text,converted_at timestamptz,converted_by_name text,maintenance_id uuid,work_order_number text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_internal_maintenance_request_member(target_organization_id) then raise exception using errcode='42501',message='Acesso negado.'; end if;
  return query select r.id,r.title,r.description,r.reported_criticality,r.status,r.equipment_id,e.name,e.category,c.name,l.name,p.full_name,u.email::text,r.created_at,r.cancellation_reason,r.cancelled_at,r.technical_priority,r.public_response,r.internal_decision_note,r.decided_at,dp.full_name,r.converted_at,cp.full_name,x.maintenance_id,m.work_order_number
  from public.maintenance_requests r join public.equipment e on e.id=r.equipment_id and e.organization_id=r.organization_id join public.clients c on c.id=r.client_id and c.organization_id=r.organization_id join public.client_locations l on l.id=r.client_location_id and l.organization_id=r.organization_id join public.profiles p on p.id=r.requested_by join auth.users u on u.id=r.requested_by
  left join public.profiles dp on dp.id=r.decided_by left join public.profiles cp on cp.id=r.converted_by left join public.maintenance_request_conversions x on x.maintenance_request_id=r.id and x.organization_id=r.organization_id left join public.maintenances m on m.id=x.maintenance_id and m.organization_id=x.organization_id
  where r.id=target_request_id and r.organization_id=target_organization_id;
end; $$;

create or replace function public.internal_get_maintenance_request_origin(target_organization_id uuid,target_maintenance_id uuid)
returns table(maintenance_request_id uuid,title text,description text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_internal_maintenance_request_member(target_organization_id) then raise exception using errcode='42501',message='Acesso negado.'; end if;
  return query select r.id,r.title,r.description from public.maintenance_request_conversions x join public.maintenance_requests r on r.id=x.maintenance_request_id and r.organization_id=x.organization_id where x.organization_id=target_organization_id and x.maintenance_id=target_maintenance_id;
end; $$;

revoke all on function public.is_internal_maintenance_request_owner(uuid),public.internal_approve_maintenance_request(uuid,uuid,text,text,text),public.internal_reject_maintenance_request(uuid,uuid,text,text),public.internal_convert_maintenance_request(uuid,uuid,text,timestamptz,uuid),public.internal_get_maintenance_request_origin(uuid,uuid) from public,anon,authenticated;
grant execute on function public.is_internal_maintenance_request_owner(uuid),public.internal_approve_maintenance_request(uuid,uuid,text,text,text),public.internal_reject_maintenance_request(uuid,uuid,text,text),public.internal_convert_maintenance_request(uuid,uuid,text,timestamptz,uuid),public.internal_get_maintenance_request_origin(uuid,uuid) to authenticated;
revoke all on function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer),public.portal_get_maintenance_request(uuid,uuid),public.internal_list_maintenance_requests(uuid,text,text,text,integer,integer),public.internal_get_maintenance_request(uuid,uuid) from public,anon;
grant execute on function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer),public.portal_get_maintenance_request(uuid,uuid),public.internal_list_maintenance_requests(uuid,text,text,text,integer,integer),public.internal_get_maintenance_request(uuid,uuid) to authenticated;

comment on table public.maintenance_request_conversions is 'Vinculo imutavel e unico entre solicitacao aprovada e OS criada atomicamente.';
comment on column public.maintenance_requests.internal_decision_note is 'Nota exclusivamente interna; nunca retornada pelas funcoes do Portal.';

commit;

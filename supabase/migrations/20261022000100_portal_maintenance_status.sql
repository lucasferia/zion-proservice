begin;

drop function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer);
create function public.portal_list_maintenance_requests(target_client_location_id uuid,search_term text default null,filter_status text default null,filter_criticality text default null,page_number integer default 1,page_size integer default 12)
returns table(id uuid,title text,description text,reported_criticality text,status text,equipment_id uuid,equipment_name text,created_at timestamptz,technical_priority text,public_response text,decided_at timestamptz,converted_at timestamptz,work_order_number text,maintenance_status text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); scope_record record; q text:=nullif(btrim(coalesce(search_term,'')),''); p int:=greatest(coalesce(page_number,1),1); s int:=least(greatest(coalesce(page_size,12),1),50);
begin
  select * into scope_record from public.current_academy_request_scope(target_client_location_id);
  return query select r.id,r.title,r.description,r.reported_criticality,r.status,r.equipment_id,e.name,r.created_at,r.technical_priority,r.public_response,r.decided_at,r.converted_at,m.work_order_number,m.status,count(*) over()::bigint
  from public.maintenance_requests r join public.equipment e on e.id=r.equipment_id and e.organization_id=r.organization_id
  left join public.maintenance_request_conversions x on x.maintenance_request_id=r.id and x.organization_id=r.organization_id
  left join public.maintenances m on m.id=x.maintenance_id and m.organization_id=x.organization_id
  where r.organization_id=scope_record.organization_id and r.client_id=scope_record.client_id and r.client_location_id=scope_record.client_location_id and r.requested_by=actor_id
    and (q is null or r.title ilike '%'||q||'%' or e.name ilike '%'||q||'%') and (nullif(filter_status,'') is null or r.status=filter_status) and (nullif(filter_criticality,'') is null or r.reported_criticality=filter_criticality)
  order by r.created_at desc,r.id limit s offset (p-1)*s;
end; $$;

drop function public.portal_get_maintenance_request(uuid,uuid);
create function public.portal_get_maintenance_request(target_client_location_id uuid,target_request_id uuid)
returns table(id uuid,title text,description text,reported_criticality text,status text,equipment_id uuid,equipment_name text,equipment_category text,location_name text,created_at timestamptz,cancellation_reason text,cancelled_at timestamptz,technical_priority text,public_response text,decided_at timestamptz,converted_at timestamptz,work_order_number text,maintenance_status text)
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); scope_record record;
begin
  select * into scope_record from public.current_academy_request_scope(target_client_location_id);
  return query select r.id,r.title,r.description,r.reported_criticality,r.status,r.equipment_id,e.name,e.category,scope_record.location_name,r.created_at,r.cancellation_reason,r.cancelled_at,r.technical_priority,r.public_response,r.decided_at,r.converted_at,m.work_order_number,m.status
  from public.maintenance_requests r join public.equipment e on e.id=r.equipment_id and e.organization_id=r.organization_id
  left join public.maintenance_request_conversions x on x.maintenance_request_id=r.id and x.organization_id=r.organization_id left join public.maintenances m on m.id=x.maintenance_id and m.organization_id=x.organization_id
  where r.id=target_request_id and r.organization_id=scope_record.organization_id and r.client_id=scope_record.client_id and r.client_location_id=scope_record.client_location_id and r.requested_by=actor_id;
end; $$;

revoke all on function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer),public.portal_get_maintenance_request(uuid,uuid) from public,anon;
grant execute on function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer),public.portal_get_maintenance_request(uuid,uuid) to authenticated;

comment on function public.portal_list_maintenance_requests(uuid,text,text,text,integer,integer) is 'Lista as solicitacoes do proprio usuario na unidade autorizada, incluindo o status real da OS convertida.';
comment on function public.portal_get_maintenance_request(uuid,uuid) is 'Retorna uma solicitacao do proprio usuario na unidade autorizada, incluindo o status real da OS convertida.';

commit;

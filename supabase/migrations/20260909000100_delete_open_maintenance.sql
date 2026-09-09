begin;

create or replace function public.delete_open_maintenance(
  target_organization_id uuid,
  target_maintenance_id uuid
)
returns table (maintenance_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para excluir esta ordem de serviço.';
  end if;

  select maintenances.status
    into target_status
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for update;

  if target_status is null then
    raise exception using errcode = 'P0002', message = 'Ordem de serviço não encontrada.';
  end if;

  if target_status not in ('draft', 'in_progress') then
    raise exception using errcode = '55000', message = 'Somente ordens de serviço abertas podem ser excluídas.';
  end if;

  if exists (
    select 1 from public.maintenance_photos as photos
    where photos.organization_id = target_organization_id and photos.maintenance_id = target_maintenance_id
  ) then
    raise exception using errcode = '55000', message = 'Remova as fotos da ordem de serviço antes de excluí-la.';
  end if;

  if exists (
    select 1 from public.payments as payment
    where payment.organization_id = target_organization_id and payment.maintenance_id = target_maintenance_id
  ) then
    raise exception using errcode = '55000', message = 'Uma ordem de serviço com histórico financeiro não pode ser excluída.';
  end if;

  if exists (
    select 1 from public.return_schedules as schedule
    where schedule.organization_id = target_organization_id and schedule.origin_maintenance_id = target_maintenance_id
  ) then
    raise exception using errcode = '55000', message = 'Uma ordem de serviço vinculada a retorno não pode ser excluída.';
  end if;

  if exists (
    select 1 from public.inventory_movements as movement
    where movement.organization_id = target_organization_id and movement.maintenance_id = target_maintenance_id
  ) then
    raise exception using errcode = '55000', message = 'Uma ordem de serviço com movimentação de estoque não pode ser excluída.';
  end if;

  delete from public.maintenance_parts as part
  where part.organization_id = target_organization_id
    and part.maintenance_id = target_maintenance_id;

  delete from public.maintenances as maintenance
  where maintenance.organization_id = target_organization_id
    and maintenance.id = target_maintenance_id;

  return query select target_maintenance_id;
end;
$$;

revoke all on function public.delete_open_maintenance(uuid, uuid) from public, anon;
grant execute on function public.delete_open_maintenance(uuid, uuid) to authenticated;

comment on function public.delete_open_maintenance(uuid, uuid) is
  'Exclui somente OS aberta sem histórico operacional, financeiro, retorno ou fotos; remove peças ainda planejadas na mesma transação.';

commit;

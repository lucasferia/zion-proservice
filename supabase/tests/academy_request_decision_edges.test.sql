begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values
 ('fa000000-0000-4000-8000-000000000001','edge-owner-a@test.local','{"full_name":"Owner Edge A"}','{"zion_account_type":"internal_owner","zion_organization_name":"Edge A"}'),
 ('fa000000-0000-4000-8000-000000000002','edge-owner-a2@test.local','{"full_name":"Owner Edge A2"}','{"zion_account_type":"internal_member"}'),
 ('fa000000-0000-4000-8000-000000000003','edge-tech-a@test.local','{"full_name":"Tech Edge A"}','{"zion_account_type":"internal_member"}'),
 ('fb000000-0000-4000-8000-000000000001','edge-owner-b@test.local','{"full_name":"Owner Edge B"}','{"zion_account_type":"internal_owner","zion_organization_name":"Edge B"}'),
 ('fc000000-0000-4000-8000-000000000001','edge-external@test.local','{"full_name":"External Edge"}','{}');

select set_config('test.edge_org',(select id::text from public.organizations where created_by='fa000000-0000-4000-8000-000000000001'),true);
select set_config('test.edge_org_b',(select id::text from public.organizations where created_by='fb000000-0000-4000-8000-000000000001'),true);
insert into public.organization_members(organization_id,user_id,role,status,created_by) values
 (current_setting('test.edge_org')::uuid,'fa000000-0000-4000-8000-000000000002','owner','active','fa000000-0000-4000-8000-000000000001'),
 (current_setting('test.edge_org')::uuid,'fa000000-0000-4000-8000-000000000003','technician','active','fa000000-0000-4000-8000-000000000001');

select set_config('zion.academy_administration','allowed',true);
update public.academy_portal_users set organization_id=current_setting('test.edge_org')::uuid,status='active',status_changed_at=now(),
 status_changed_by='fa000000-0000-4000-8000-000000000001',status_change_reason='Fixture edge',updated_by='fa000000-0000-4000-8000-000000000001'
where user_id='fc000000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration','',true);

insert into public.clients(id,organization_id,name,created_by,updated_by) values
 ('fa100000-0000-4000-8000-000000000001',current_setting('test.edge_org')::uuid,'Cliente Base','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa100000-0000-4000-8000-000000000002',current_setting('test.edge_org')::uuid,'Cliente Arquivado','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa100000-0000-4000-8000-000000000003',current_setting('test.edge_org')::uuid,'Cliente Unidade Arquivada','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa100000-0000-4000-8000-000000000004',current_setting('test.edge_org')::uuid,'Cliente Transferencia','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001');
insert into public.client_locations(id,organization_id,client_id,name,street,city,state,created_by,updated_by) values
 ('fa110000-0000-4000-8000-000000000001',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','Base','Rua 1','Sao Paulo','SP','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa110000-0000-4000-8000-000000000002',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000002','Cliente arquivado','Rua 2','Sao Paulo','SP','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa110000-0000-4000-8000-000000000003',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000003','Arquivada','Rua 3','Sao Paulo','SP','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa110000-0000-4000-8000-000000000004',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000004','Origem','Rua 4','Sao Paulo','SP','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa110000-0000-4000-8000-000000000005',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000004','Destino','Rua 5','Sao Paulo','SP','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001');
insert into public.equipment(id,organization_id,client_id,client_location_id,name,category,status,created_by,updated_by) values
 ('fa120000-0000-4000-8000-000000000001',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','Equipamento Base','Cardio','operational','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa120000-0000-4000-8000-000000000002',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000002','fa110000-0000-4000-8000-000000000002','Equipamento Cliente','Cardio','operational','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa120000-0000-4000-8000-000000000003',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000003','fa110000-0000-4000-8000-000000000003','Equipamento Unidade','Cardio','operational','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001'),
 ('fa120000-0000-4000-8000-000000000004',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000004','fa110000-0000-4000-8000-000000000004','Equipamento Transferido','Cardio','operational','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001');

insert into public.maintenance_requests(id,organization_id,client_id,client_location_id,equipment_id,requested_by,submission_key,title,description,reported_criticality,status,cancellation_reason,cancelled_at,cancelled_by) values
 ('fa130000-0000-4000-8000-000000000001',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','fa120000-0000-4000-8000-000000000001','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000001','Rollback controlado','Falha intermediaria deve reverter tudo.','medium','pending',null,null,null),
 ('fa130000-0000-4000-8000-000000000002',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000002','fa110000-0000-4000-8000-000000000002','fa120000-0000-4000-8000-000000000002','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000002','Cliente arquivado','Conversao deve ser bloqueada pelo cliente.','medium','pending',null,null,null),
 ('fa130000-0000-4000-8000-000000000003',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000003','fa110000-0000-4000-8000-000000000003','fa120000-0000-4000-8000-000000000003','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000003','Unidade arquivada','Conversao deve ser bloqueada pela unidade.','medium','pending',null,null,null),
 ('fa130000-0000-4000-8000-000000000004',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000004','fa110000-0000-4000-8000-000000000004','fa120000-0000-4000-8000-000000000004','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000004','Equipamento transferido','Conversao deve preservar o contexto original.','medium','pending',null,null,null),
 ('fa130000-0000-4000-8000-000000000005',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','fa120000-0000-4000-8000-000000000001','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000005','Cancelada externa','Solicitacao terminal cancelada.','low','cancelled','Cancelada pela academia',now(),'fc000000-0000-4000-8000-000000000001'),
 ('fa130000-0000-4000-8000-000000000006',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','fa120000-0000-4000-8000-000000000001','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000006','OS cancelada','Conversao seguida de cancelamento da OS.','medium','pending',null,null,null),
 ('fa130000-0000-4000-8000-000000000007',current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','fa120000-0000-4000-8000-000000000001','fc000000-0000-4000-8000-000000000001','fa140000-0000-4000-8000-000000000007','OS concluida','Conversao seguida de conclusao da OS.','medium','pending',null,null,null);

grant select on public.maintenance_requests,public.maintenance_request_events,public.maintenances,public.maintenance_request_conversions to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000001',true);
select public.internal_approve_maintenance_request(current_setting('test.edge_org')::uuid,id,'medium',null,null)
from public.maintenance_requests where id in ('fa130000-0000-4000-8000-000000000001','fa130000-0000-4000-8000-000000000002','fa130000-0000-4000-8000-000000000003','fa130000-0000-4000-8000-000000000004','fa130000-0000-4000-8000-000000000006','fa130000-0000-4000-8000-000000000007');

reset role;
create function pg_temp.reject_conversion_link() returns trigger language plpgsql as $$begin raise exception 'falha injetada depois do insert da OS'; end$$;
create trigger reject_conversion_link before insert on public.maintenance_request_conversions for each row execute function pg_temp.reject_conversion_link();
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000001',true);
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000001','corrective','2026-10-05 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%falha injetada%','falha intermediaria e propagada');
reset role;
drop trigger reject_conversion_link on public.maintenance_request_conversions;
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000001',true);
select is((select status from public.maintenance_requests where id='fa130000-0000-4000-8000-000000000001'),'approved','rollback preserva status aprovado');
select is((select count(*) from public.maintenance_request_conversions where maintenance_request_id='fa130000-0000-4000-8000-000000000001'),0::bigint,'rollback remove vinculo parcial');
select is((select count(*) from public.maintenances m where m.client_id='fa100000-0000-4000-8000-000000000001'),0::bigint,'rollback remove OS parcial');
select is((select count(*) from public.maintenance_request_events where maintenance_request_id='fa130000-0000-4000-8000-000000000001' and action='request_converted'),0::bigint,'rollback nao grava evento de conversao');

select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000005','corrective','2026-10-05 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%aprovadas%','cancelled nunca converte');
reset role;

update public.clients set deleted_at=now(),deleted_by='fa000000-0000-4000-8000-000000000001' where id='fa100000-0000-4000-8000-000000000002';
update public.client_locations set deleted_at=now(),deleted_by='fa000000-0000-4000-8000-000000000001' where id='fa110000-0000-4000-8000-000000000003';
update public.equipment set client_location_id='fa110000-0000-4000-8000-000000000005' where id='fa120000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000001',true);
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000002','corrective','2026-10-05 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%elegivel%','cliente arquivado impede conversao');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000003','corrective','2026-10-05 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%elegivel%','unidade arquivada impede conversao');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000004','corrective','2026-10-05 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%elegivel%','equipamento transferido impede conversao');

select set_config('test.edge_cancel_os',(select maintenance_id::text from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000006','corrective','2026-10-06 12:00+00','fa000000-0000-4000-8000-000000000003')),true);
select is((select count(*) from public.maintenance_parts where maintenance_id=current_setting('test.edge_cancel_os')::uuid),0::bigint,'conversao nao cria pecas');
select is((select count(*) from public.inventory_movements where maintenance_id=current_setting('test.edge_cancel_os')::uuid),0::bigint,'conversao nao movimenta estoque');
select is((select count(*) from public.payments where maintenance_id=current_setting('test.edge_cancel_os')::uuid),0::bigint,'conversao nao cria pagamentos');
select is((select count(*) from public.return_schedules where origin_maintenance_id=current_setting('test.edge_cancel_os')::uuid),0::bigint,'conversao nao cria agenda ou retorno');
select public.cancel_maintenance(current_setting('test.edge_org')::uuid,current_setting('test.edge_cancel_os')::uuid,'Cancelamento de teste');
select is((select maintenance_id from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000006','corrective','2026-10-06 12:00+00','fa000000-0000-4000-8000-000000000003')),current_setting('test.edge_cancel_os')::uuid,'retry apos cancelamento retorna a OS original sem reconverter');

select set_config('test.edge_complete_os',(select maintenance_id::text from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000007','preventive','2026-10-07 12:00+00','fa000000-0000-4000-8000-000000000003')),true);
update public.maintenances set diagnosis='Diagnostico QA',service_performed='Servico QA',next_return_date='2026-10-20' where id=current_setting('test.edge_complete_os')::uuid;
select lives_ok(format('select * from public.complete_maintenance_with_return(%L::uuid,%L::uuid,%L::date)',current_setting('test.edge_org'),current_setting('test.edge_complete_os'),'2026-10-20'),'OS convertida preserva ciclo normal de conclusao');
select is((select maintenance_id from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000007','preventive','2026-10-07 12:00+00','fa000000-0000-4000-8000-000000000003')),current_setting('test.edge_complete_os')::uuid,'retry apos conclusao retorna a OS original sem reconverter');

reset role;
update public.organization_members set role='technician' where organization_id=current_setting('test.edge_org')::uuid and user_id='fa000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','fa000000-0000-4000-8000-000000000001',true);
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000006','corrective','2026-10-06 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%owner%','perda de papel owner bloqueia inclusive retry bem sucedido');
select lives_ok($$insert into public.maintenances(organization_id,client_id,client_location_id,equipment_id,maintenance_type,scheduled_at,responsible_technician_id,notes) values(current_setting('test.edge_org')::uuid,'fa100000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','fa120000-0000-4000-8000-000000000001','corrective','2026-10-08 12:00+00','fa000000-0000-4000-8000-000000000001','Fixture manual technician Stage 15')$$,'technician preserva criacao manual de OS');
select lives_ok($$update public.maintenances set status='in_progress',diagnosis='Diagnostico manual do tecnico' where organization_id=current_setting('test.edge_org')::uuid and notes='Fixture manual technician Stage 15'$$,'technician preserva edicao e ciclo manual de OS');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','fc000000-0000-4000-8000-000000000001',true);
select throws_like($$select public.internal_approve_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000001','high',null,null)$$,'%owner%','externo nao decide');
select throws_like($$select public.internal_reject_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000001','Resposta bloqueada.',null)$$,'%owner%','externo nao rejeita');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.edge_org')::uuid,'fa130000-0000-4000-8000-000000000001','corrective','2026-10-05 12:00+00','fa000000-0000-4000-8000-000000000003')$$,'%owner%','externo nao converte');
reset role;

select * from finish();
rollback;

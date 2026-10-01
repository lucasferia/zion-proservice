begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values
 ('f1000000-0000-4000-8000-000000000001','stage15-owner-a@test.local','{"full_name":"Owner Stage 15 A"}','{"zion_account_type":"internal_owner","zion_organization_name":"Stage 15 A"}'),
 ('f1000000-0000-4000-8000-000000000002','stage15-tech-a@test.local','{"full_name":"Tech Stage 15 A"}','{"zion_account_type":"internal_member"}'),
 ('f2000000-0000-4000-8000-000000000001','stage15-owner-b@test.local','{"full_name":"Owner Stage 15 B"}','{"zion_account_type":"internal_owner","zion_organization_name":"Stage 15 B"}'),
 ('f3000000-0000-4000-8000-000000000001','stage15-portal@test.local','{"full_name":"Portal Stage 15"}','{}');

select set_config('test.s15_org_a',(select id::text from public.organizations where created_by='f1000000-0000-4000-8000-000000000001'),true);
select set_config('test.s15_org_b',(select id::text from public.organizations where created_by='f2000000-0000-4000-8000-000000000001'),true);
insert into public.organization_members(organization_id,user_id,role,status,created_by)
values(current_setting('test.s15_org_a')::uuid,'f1000000-0000-4000-8000-000000000002','technician','active','f1000000-0000-4000-8000-000000000001');

select set_config('zion.academy_administration','allowed',true);
update public.academy_portal_users set organization_id=current_setting('test.s15_org_a')::uuid,status='active',
  status_changed_at=now(),status_changed_by='f1000000-0000-4000-8000-000000000001',status_change_reason='Fixture Stage 15',
  updated_by='f1000000-0000-4000-8000-000000000001' where user_id='f3000000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration','',true);

insert into public.clients(id,organization_id,name,created_by,updated_by) values
 ('f1100000-0000-4000-8000-000000000001',current_setting('test.s15_org_a')::uuid,'Academia Stage 15','f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001');
insert into public.client_locations(id,organization_id,client_id,name,street,city,state,created_by,updated_by) values
 ('f1110000-0000-4000-8000-000000000001',current_setting('test.s15_org_a')::uuid,'f1100000-0000-4000-8000-000000000001','Unidade Stage 15','Rua QA','Sao Paulo','SP','f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001');
insert into public.equipment(id,organization_id,client_id,client_location_id,name,category,status,created_by,updated_by) values
 ('f1200000-0000-4000-8000-000000000001',current_setting('test.s15_org_a')::uuid,'f1100000-0000-4000-8000-000000000001','f1110000-0000-4000-8000-000000000001','Esteira Stage 15','Cardio','operational','f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001');

insert into public.maintenance_requests(id,organization_id,client_id,client_location_id,equipment_id,requested_by,submission_key,title,description,reported_criticality) values
 ('f1300000-0000-4000-8000-000000000001',current_setting('test.s15_org_a')::uuid,'f1100000-0000-4000-8000-000000000001','f1110000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','f1310000-0000-4000-8000-000000000001','Ruido no motor','Ruido continuo informado pela academia.','critical'),
 ('f1300000-0000-4000-8000-000000000002',current_setting('test.s15_org_a')::uuid,'f1100000-0000-4000-8000-000000000001','f1110000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','f1310000-0000-4000-8000-000000000002','Pedido sem cobertura','Relato destinado ao teste de rejeicao.','low'),
 ('f1300000-0000-4000-8000-000000000003',current_setting('test.s15_org_a')::uuid,'f1100000-0000-4000-8000-000000000001','f1110000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','f1310000-0000-4000-8000-000000000003','Equipamento inativo','Relato destinado ao bloqueio de conversao.','medium');

select has_table('public','maintenance_request_conversions','vinculo de conversao existe');
select ok(not has_table_privilege('authenticated','public.maintenance_request_conversions','INSERT'),'conversao direta e negada');
select ok(not has_table_privilege('authenticated','public.maintenance_request_conversions','DELETE'),'delete direto do vinculo e negado');
select ok(has_function_privilege('authenticated','public.internal_approve_maintenance_request(uuid,uuid,text,text,text)','EXECUTE'),'owner usa RPC de aprovacao');
select ok(not has_function_privilege('anon','public.internal_convert_maintenance_request(uuid,uuid,text,timestamptz,uuid)','EXECUTE'),'anon nao converte');
select ok((select prosecdef from pg_proc where oid='public.internal_convert_maintenance_request(uuid,uuid,text,timestamptz,uuid)'::regprocedure),'conversao usa security definer');
select ok((select lower(prosrc) like '%for update%' from pg_proc where oid='public.internal_convert_maintenance_request(uuid,uuid,text,timestamptz,uuid)'::regprocedure),'conversao bloqueia a solicitacao');
select ok((select lower(prosrc) like '%for update%' from pg_proc where oid='public.internal_approve_maintenance_request(uuid,uuid,text,text,text)'::regprocedure),'aprovacao serializa com cancelamento, fotos e outras decisoes');
select ok((select lower(prosrc) like '%for update%' from pg_proc where oid='public.internal_reject_maintenance_request(uuid,uuid,text,text)'::regprocedure),'rejeicao serializa com aprovacao e cancelamento');
select is((select count(*) from pg_constraint where conrelid='public.maintenance_request_conversions'::regclass and contype in ('p','u')),2::bigint,'request e OS possuem unicidade um para um');
select ok(pg_get_function_result('public.portal_get_maintenance_request(uuid,uuid)'::regprocedure) not ilike '%internal_decision_note%','Portal nao expoe nota interna');
select ok(pg_get_function_result('public.portal_get_maintenance_request(uuid,uuid)'::regprocedure) not ilike '%maintenance_id%','Portal nao expoe UUID interno da OS');

-- Grants temporarios permitem inspecionar o resultado sob as RLS reais; o rollback os remove.
grant select on public.maintenance_requests, public.maintenance_request_events, public.maintenances to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
select throws_like($$select public.internal_approve_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','high',null,null)$$,'%owner%','technician nao aprova');
select throws_like($$select public.internal_reject_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','Resposta negada ao tecnico.',null)$$,'%owner%','technician nao rejeita');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','corrective','2026-10-01 12:00+00','f1000000-0000-4000-8000-000000000002')$$,'%owner%','technician nao converte');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select throws_like($$select * from public.internal_get_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001')$$,'%Acesso negado%','owner de outro tenant nao acessa solicitacao');
select throws_like($$select public.internal_approve_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','high',null,null)$$,'%owner%','owner de outro tenant nao decide');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','corrective','2026-10-01 12:00+00','f1000000-0000-4000-8000-000000000002')$$,'%owner%','owner de outro tenant nao converte');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.internal_approve_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','high','Visita aprovada.','Rota da zona sul.')$$,'owner aprova sem criar OS');
select is((select status from public.maintenance_requests where id='f1300000-0000-4000-8000-000000000001'),'approved','status aprovado e persistido');
select is((select count(*) from public.maintenances),0::bigint,'aprovacao nao cria OS');
select lives_ok($$select public.internal_approve_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','high','Visita aprovada.','Rota da zona sul.')$$,'retry identico da aprovacao e idempotente');
select is((select count(*) from public.maintenance_request_events where maintenance_request_id='f1300000-0000-4000-8000-000000000001' and action='request_approved'),1::bigint,'retry nao duplica evento');
select throws_like($$select public.internal_approve_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','critical','Visita aprovada.',null)$$,'%dados diferentes%','retry divergente gera conflito');
select throws_like($$select public.internal_reject_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','Rejeitar depois.',null)$$,'%pendentes%','aprovada nao pode ser rejeitada');
select lives_ok($$select public.internal_reject_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000002','Solicitacao fora da cobertura.',null)$$,'owner rejeita com resposta publica');
select is((select status from public.maintenance_requests where id='f1300000-0000-4000-8000-000000000002'),'rejected','status rejeitado e persistido');
select is((select count(*) from public.maintenances),0::bigint,'rejeicao nao cria OS');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000002','corrective','2026-10-01 13:00+00','f1000000-0000-4000-8000-000000000002')$$,'%aprovadas%','rejeitada nunca converte');

select set_config('test.s15_maintenance_id',(select maintenance_id::text from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','corrective','2026-10-01 12:00+00','f1000000-0000-4000-8000-000000000002')),true);
select is((select status from public.maintenance_requests where id='f1300000-0000-4000-8000-000000000001'),'converted','conversao atualiza solicitacao');
select is((select status from public.maintenances where id=current_setting('test.s15_maintenance_id')::uuid),'draft','OS nasce em rascunho');
select ok((select diagnosis is null and service_performed is null and notes is null and total_amount=0 from public.maintenances where id=current_setting('test.s15_maintenance_id')::uuid),'conversao nao inventa relatorio ou valores');
select is((select maintenance_id from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','corrective','2026-10-01 12:00+00','f1000000-0000-4000-8000-000000000002')),current_setting('test.s15_maintenance_id')::uuid,'retry identico retorna a mesma OS');
select is((select count(*) from public.maintenances),1::bigint,'retry nao duplica OS');
select is((select count(*) from public.maintenance_request_events where maintenance_request_id='f1300000-0000-4000-8000-000000000001' and action='request_converted'),1::bigint,'retry nao duplica auditoria');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000001','preventive','2026-10-01 12:00+00','f1000000-0000-4000-8000-000000000002')$$,'%dados diferentes%','retry divergente da conversao conflita');
select throws_like(format('select * from public.delete_open_maintenance(%L::uuid,%L::uuid)',current_setting('test.s15_org_a'),current_setting('test.s15_maintenance_id')),'%violates foreign key constraint%','OS convertida nao pode ser excluida deixando referencia quebrada');
select lives_ok($$select public.internal_approve_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000003','medium',null,null)$$,'terceira solicitacao aprovada');
reset role;

update public.equipment set status='inactive' where id='f1200000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000003','corrective','2026-10-02 12:00+00','f1000000-0000-4000-8000-000000000002')$$,'%elegivel%','equipamento inativo bloqueia conversao');
reset role;

-- Corrupcao historica simulada: identidade externa nunca herda autoridade interna.
set local session_replication_role = replica;
insert into public.academy_portal_users(user_id,status,created_by,updated_by)
values('f1000000-0000-4000-8000-000000000001','pending','f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select ok(not public.is_internal_maintenance_request_owner(current_setting('test.s15_org_a')::uuid),'dupla classificacao bloqueia autoridade de owner');
select throws_like($$select public.internal_reject_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000003','Resposta bloqueada.',null)$$,'%owner%','dupla classificacao nao decide');
select throws_like($$select * from public.internal_convert_maintenance_request(current_setting('test.s15_org_a')::uuid,'f1300000-0000-4000-8000-000000000003','corrective','2026-10-02 12:00+00','f1000000-0000-4000-8000-000000000002')$$,'%owner%','dupla classificacao nao converte');
reset role;

select is((select count(*) from public.maintenance_request_events where action in ('request_approved','request_rejected','request_converted')),4::bigint,'eventos de decisao sao completos e unicos');
select ok((select internal_decision_note='Rota da zona sul.' from public.maintenance_requests where id='f1300000-0000-4000-8000-000000000001'),'nota interna preservada separadamente');
select * from finish();
rollback;

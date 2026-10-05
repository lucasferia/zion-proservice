begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('d1000000-0000-4000-8000-000000000001', 'discount-owner-a@test.local', '{"full_name":"Owner Desconto A"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Tenant Desconto A"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000002', 'discount-owner-b@test.local', '{"full_name":"Owner Desconto B"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Tenant Desconto B"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000003', 'discount-technician@test.local', '{"full_name":"Técnico Desconto"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000004', 'discount-external@test.local', '{"full_name":"Externo Desconto"}'::jsonb, '{}'::jsonb);

select set_config('test.discount_org_a', (select id::text from public.organizations where created_by='d1000000-0000-4000-8000-000000000001'), true);
select set_config('test.discount_org_b', (select id::text from public.organizations where created_by='d1000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id,user_id,role,status,created_by)
values (current_setting('test.discount_org_a')::uuid,'d1000000-0000-4000-8000-000000000003','technician','active','d1000000-0000-4000-8000-000000000001');

insert into public.clients (id,organization_id,name,created_by,updated_by)
values
  ('d1100000-0000-4000-8000-000000000001',current_setting('test.discount_org_a')::uuid,'Academia Desconto A','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1100000-0000-4000-8000-000000000002',current_setting('test.discount_org_b')::uuid,'Academia Desconto B','d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002');

insert into public.equipment (id,organization_id,client_id,name,category,created_by,updated_by)
values
  ('d1200000-0000-4000-8000-000000000001',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','Esteira Desconto A','Cardio','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1200000-0000-4000-8000-000000000002',current_setting('test.discount_org_b')::uuid,'d1100000-0000-4000-8000-000000000002','Esteira Desconto B','Cardio','d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002');

insert into public.inventory_items (id,organization_id,name,unit_of_measure,average_unit_cost,created_by,updated_by)
values ('d1300000-0000-4000-8000-000000000001',current_setting('test.discount_org_a')::uuid,'Cabo de aço','unidade',40,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001');

insert into public.maintenances (
  id,organization_id,client_id,equipment_id,work_order_number,maintenance_type,status,scheduled_at,
  responsible_technician_id,labor_amount,discount_type,discount_value,created_by,updated_by
)
values
  ('d1400000-0000-4000-8000-000000000001',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-LEGACY','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',1000,'percentage',0,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1400000-0000-4000-8000-000000000002',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-PERCENT','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',1000,'percentage',10,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1400000-0000-4000-8000-000000000003',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-FIXED','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',1000,'fixed',150,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1400000-0000-4000-8000-000000000004',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-ROUND','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',10.01,'percentage',33.3333,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1400000-0000-4000-8000-000000000005',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-PART','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',600,'percentage',10,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1400000-0000-4000-8000-000000000006',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-PAYMENT','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',1000,'fixed',0,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
  ('d1400000-0000-4000-8000-000000000007',current_setting('test.discount_org_b')::uuid,'d1100000-0000-4000-8000-000000000002','d1200000-0000-4000-8000-000000000002','OS-DESC-OTHER','corrective','draft',now(),'d1000000-0000-4000-8000-000000000002',500,'fixed',50,'d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002'),
  ('d1400000-0000-4000-8000-000000000008',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-CLOSED','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',1000,'fixed',150,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001');

insert into public.maintenances (
  id,organization_id,client_id,equipment_id,work_order_number,maintenance_type,status,scheduled_at,
  responsible_technician_id,labor_amount,created_by,updated_by
)
values ('d1400000-0000-4000-8000-000000000009',current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1200000-0000-4000-8000-000000000001','OS-DESC-OLD-CLIENT','corrective','draft',now(),'d1000000-0000-4000-8000-000000000001',123,'d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001');

select set_config('zion.maintenance_completion','allowed',true);
update public.maintenances
set status='completed',completed_at=now(),completed_by='d1000000-0000-4000-8000-000000000001'
where id='d1400000-0000-4000-8000-000000000008';
select set_config('zion.maintenance_completion','',true);

select has_column('public','maintenances','discount_type','OS registra o tipo do desconto');
select has_column('public','maintenances','discount_value','OS preserva o valor informado');
select has_column('public','maintenances','discount_amount','OS registra o desconto monetário calculado');

select is((select discount_value from public.maintenances where id='d1400000-0000-4000-8000-000000000001'),0::numeric,'OS sem desconto mantém valor zero');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000001'),0::numeric,'OS sem desconto mantém desconto calculado zero');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000001'),1000.00::numeric,'OS sem desconto preserva o comportamento anterior');
select is((select discount_type from public.maintenances where id='d1400000-0000-4000-8000-000000000009'),'percentage','frontend anterior recebe tipo padrão seguro');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000009'),0::numeric,'frontend anterior recebe desconto monetário zero');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000009'),123.00::numeric,'frontend anterior preserva o total sem desconto');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000002'),100.00::numeric,'percentual calcula o desconto em reais');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000002'),900.00::numeric,'percentual reduz o total uma única vez');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000003'),150.00::numeric,'valor fixo preserva o desconto informado');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000003'),850.00::numeric,'valor fixo reduz o total corretamente');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000004'),3.34::numeric,'percentual arredonda o desconto para centavos');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000004'),6.67::numeric,'total usa o mesmo arredondamento do desconto');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001',true);

select throws_like($$update public.maintenances set discount_value=100.0001 where id='d1400000-0000-4000-8000-000000000002'$$,'%entre 0 e 100%','banco rejeita percentual acima de 100');
select throws_like($$update public.maintenances set discount_value=-1 where id='d1400000-0000-4000-8000-000000000002'$$,'%não pode ser negativo%','banco rejeita desconto negativo');
select throws_like($$update public.maintenances set discount_type='fixed',discount_value=10.001 where id='d1400000-0000-4000-8000-000000000002'$$,'%duas casas decimais%','banco rejeita fração de centavo no desconto fixo');
select throws_like($$update public.maintenances set discount_type='fixed',discount_value=1000.01 where id='d1400000-0000-4000-8000-000000000002'$$,'%não pode ultrapassar o subtotal%','banco rejeita valor fixo acima do subtotal');
select lives_ok($$update public.maintenances set discount_type='percentage',discount_value=100 where id='d1400000-0000-4000-8000-000000000001'$$,'percentual aceita o limite máximo de 100');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000001'),0.00::numeric,'desconto de 100 por cento resulta em total zero');
select is((select maintenance_total from public.get_maintenance_payment_summary(current_setting('test.discount_org_a')::uuid,'d1400000-0000-4000-8000-000000000002')),900.00::numeric,'financeiro recebe o total líquido sem reaplicar o desconto');

select lives_ok($$insert into public.maintenance_parts (organization_id,maintenance_id,inventory_item_id,quantity,unit_cost_amount,unit_charge_amount) values (current_setting('test.discount_org_a')::uuid,'d1400000-0000-4000-8000-000000000005','d1300000-0000-4000-8000-000000000001',2,40,200)$$,'material cobrado participa do subtotal');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000005'),100.00::numeric,'percentual acompanha aumento do subtotal por material');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000005'),900.00::numeric,'total líquido inclui material e desconto uma vez');
select lives_ok($$update public.maintenance_parts set unit_charge_amount=100 where maintenance_id='d1400000-0000-4000-8000-000000000005'$$,'preço do material pode ser ajustado em OS aberta');
select is((select discount_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000005'),80.00::numeric,'percentual acompanha redução do subtotal');
select lives_ok($$update public.maintenances set discount_type='fixed',discount_value=700 where id='d1400000-0000-4000-8000-000000000005'$$,'OS aberta aceita desconto fixo válido');
select is((select total_amount from public.maintenances where id='d1400000-0000-4000-8000-000000000005'),100.00::numeric,'valor fixo permanece informado no novo subtotal');
select throws_like($$update public.maintenances set labor_amount=0 where id='d1400000-0000-4000-8000-000000000005'$$,'%não pode ultrapassar o subtotal%','redução do subtotal exige ajustar desconto fixo inválido');

select lives_ok($$insert into public.payments (organization_id,client_id,maintenance_id,amount,method,status,paid_at) values (current_setting('test.discount_org_a')::uuid,'d1100000-0000-4000-8000-000000000001','d1400000-0000-4000-8000-000000000006',900,'pix','received',now())$$,'pagamento recebido prepara o teto financeiro');
select throws_like($$update public.maintenances set discount_type='fixed',discount_value=150 where id='d1400000-0000-4000-8000-000000000006'$$,'%não pode ficar abaixo dos pagamentos ativos%','desconto não reduz total abaixo de pagamentos ativos');

select lives_ok($$update public.maintenances set discount_value=100 where id='d1400000-0000-4000-8000-000000000008'$$,'RLS trata tentativa em OS concluída sem ampliar acesso');
select is((select discount_value from public.maintenances where id='d1400000-0000-4000-8000-000000000008'),150::numeric,'OS concluída preserva o desconto original');

select is((select count(*) from public.maintenances where organization_id=current_setting('test.discount_org_b')::uuid),0::bigint,'RLS oculta descontos de outro tenant');

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000003',true);
select lives_ok($$update public.maintenances set discount_type='percentage',discount_value=5 where id='d1400000-0000-4000-8000-000000000001'$$,'technician preserva permissão existente para precificar OS aberta');

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000004',true);
select is((select count(*) from public.maintenances),0::bigint,'usuário externo não recebe dados financeiros ou descontos');

select * from finish();
rollback;

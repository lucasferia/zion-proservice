import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const url = process.env.STAGE15_API_URL
const anonKey = process.env.STAGE15_ANON_KEY
const serviceKey = process.env.STAGE15_SERVICE_KEY
if (!url || !anonKey || !serviceKey) throw new Error('Configure apenas as credenciais da stack Supabase local em memória.')

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const browserClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
const suffix = randomUUID().slice(0, 8)
const password = `Qa-${randomUUID()}-9a!`
const email = (name) => `stage15-${name}-${suffix}@example.test`
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const rpc = async (client, name, args) => { const { data, error } = await client.rpc(name, args); if (error) throw error; return data }
const signIn = async (address) => { const client = browserClient(); const { error } = await client.auth.signInWithPassword({ email: address, password }); if (error) throw error; return client }
const createUser = async (address, name) => {
  const { data, error } = await admin.auth.admin.createUser({ email: address, password, email_confirm: true, user_metadata: { full_name: name } })
  if (error) throw error
  return data.user
}

const ownerEmail = email('owner')
const portalEmail = email('portal')
const secondPortalEmail = email('portal-two')
const ownerUser = await createUser(ownerEmail, 'Owner Visual QA')
const { error: provisionError } = await admin.rpc('provision_internal_owner', { target_user_id: ownerUser.id, target_organization_name: `QA Etapa 15 ${suffix}` })
if (provisionError) throw provisionError
const portalUser = await createUser(portalEmail, 'Academia Visual QA')
const secondPortalUser = await createUser(secondPortalEmail, 'Academia Concorrência QA')
const ownerA = await signIn(ownerEmail)
const ownerB = await signIn(ownerEmail)
const portal = await signIn(portalEmail)
const secondPortal = await signIn(secondPortalEmail)

const { data: membership, error: membershipError } = await ownerA.from('organization_members').select('organization_id').eq('user_id', ownerUser.id).eq('status', 'active').single()
if (membershipError) throw membershipError
const organizationId = membership.organization_id
const { data: clientRow, error: clientError } = await ownerA.from('clients').insert({ organization_id: organizationId, name: `Academia QA ${suffix}` }).select('id').single()
if (clientError) throw clientError
const { data: locations, error: locationError } = await ownerA.from('client_locations').insert([
  { organization_id: organizationId, client_id: clientRow.id, name: 'Unidade Centro QA', street: 'Rua QA', city: 'São Paulo', state: 'SP' },
  { organization_id: organizationId, client_id: clientRow.id, name: 'Unidade Sul QA', street: 'Rua QA Sul', city: 'São Paulo', state: 'SP' },
]).select('id,name')
if (locationError) throw locationError
const locationId = locations.find((item) => item.name === 'Unidade Centro QA').id
const secondLocationId = locations.find((item) => item.name === 'Unidade Sul QA').id
const { data: equipment, error: equipmentError } = await ownerA.from('equipment').insert({ organization_id: organizationId, client_id: clientRow.id, client_location_id: locationId, name: 'Esteira Visual QA', category: 'Cardio', status: 'operational' }).select('id').single()
if (equipmentError) throw equipmentError

await rpc(ownerA, 'configure_academy_portal_user', { target_user_id: portalUser.id, target_client_id: clientRow.id, target_location_ids: [locationId, secondLocationId], target_commercial_status: 'active', change_reason: 'Fixture visual Etapa 15', target_expected_updated_at: null })
await rpc(ownerA, 'configure_academy_portal_user', { target_user_id: secondPortalUser.id, target_client_id: clientRow.id, target_location_ids: [locationId], target_commercial_status: 'active', change_reason: 'Fixture concorrência Etapa 15', target_expected_updated_at: null })

const createRequest = (client, title, key = randomUUID()) => rpc(client, 'portal_create_maintenance_request', {
  target_client_location_id: locationId, target_equipment_id: equipment.id, request_title: title,
  request_description: `Descrição controlada para ${title}, sem dados comerciais reais.`, request_criticality: 'high', request_submission_key: key,
})
const approveArgs = (requestId) => ({ target_organization_id: organizationId, target_request_id: requestId, target_priority: 'high', response_to_academy: 'Atendimento aprovado para programação.', decision_note: 'Nota interna exclusiva QA.' })
const conversionArgs = (requestId) => ({ target_organization_id: organizationId, target_request_id: requestId, target_maintenance_type: 'corrective', target_scheduled_at: '2026-10-08T13:00:00.000Z', target_responsible_technician_id: ownerUser.id })

const concurrentConversionRequest = await createRequest(portal, 'Conversão concorrente QA')
await rpc(ownerA, 'internal_approve_maintenance_request', approveArgs(concurrentConversionRequest))
const conversionResults = await Promise.all([
  rpc(ownerA, 'internal_convert_maintenance_request', conversionArgs(concurrentConversionRequest)),
  rpc(ownerB, 'internal_convert_maintenance_request', conversionArgs(concurrentConversionRequest)),
])
assert(conversionResults[0][0].maintenance_id === conversionResults[1][0].maintenance_id, 'Conversões concorrentes retornaram OS diferentes.')
const { count: convertedOrderCount } = await ownerA.from('maintenances').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId)
assert(convertedOrderCount === 1, 'Conversões concorrentes criaram mais de uma OS.')

const decisionRaceRequest = await createRequest(portal, 'Aprovar versus rejeitar QA')
const decisionRace = await Promise.allSettled([
  rpc(ownerA, 'internal_approve_maintenance_request', approveArgs(decisionRaceRequest)),
  rpc(ownerB, 'internal_reject_maintenance_request', { target_organization_id: organizationId, target_request_id: decisionRaceRequest, response_to_academy: 'Solicitação rejeitada no teste concorrente.', decision_note: null }),
])
assert(decisionRace.filter((item) => item.status === 'fulfilled').length === 1, 'Aprovação e rejeição concorrentes não produziram vencedor único.')

const cancelRaceRequest = await createRequest(secondPortal, 'Aprovar versus cancelar QA')
const cancelRace = await Promise.allSettled([
  rpc(ownerA, 'internal_approve_maintenance_request', approveArgs(cancelRaceRequest)),
  rpc(secondPortal, 'portal_cancel_maintenance_request', { target_client_location_id: locationId, target_request_id: cancelRaceRequest, cancel_reason: 'Cancelamento concorrente da academia.' }),
])
assert(cancelRace.filter((item) => item.status === 'fulfilled').length === 1, 'Aprovação e cancelamento concorrentes não produziram vencedor único.')

const photoRaceRequest = await createRequest(portal, 'Upload versus decisão QA')
const prefix = await rpc(portal, 'portal_get_maintenance_request_upload_prefix', { target_client_location_id: locationId, target_request_id: photoRaceRequest })
const preservedPath = `${prefix}/${randomUUID()}.webp`
const orphanPath = `${prefix}/${randomUUID()}.webp`
const tinyWebp = new Blob([Uint8Array.from([82,73,70,70,18,0,0,0,87,69,66,80,86,80,56,32,6,0,0,0,16,0,0,0,0,0])], { type: 'image/webp' })
for (const path of [preservedPath, orphanPath]) { const { error } = await portal.storage.from('maintenance-request-photos').upload(path, tinyWebp, { contentType: 'image/webp' }); if (error) throw error }
await rpc(portal, 'portal_register_maintenance_request_photo', { target_client_location_id: locationId, target_request_id: photoRaceRequest, target_storage_path: preservedPath, target_mime_type: 'image/webp', target_file_size: tinyWebp.size, target_sort_order: 0 })
await rpc(ownerA, 'internal_approve_maintenance_request', approveArgs(photoRaceRequest))
let lateRegistrationDenied = false
try { await rpc(portal, 'portal_register_maintenance_request_photo', { target_client_location_id: locationId, target_request_id: photoRaceRequest, target_storage_path: orphanPath, target_mime_type: 'image/webp', target_file_size: tinyWebp.size, target_sort_order: 1 }) } catch { lateRegistrationDenied = true }
assert(lateRegistrationDenied, 'Registro de metadado posterior à decisão foi aceito.')
const orphanRemoval = await portal.storage.from('maintenance-request-photos').remove([orphanPath])
assert(!orphanRemoval.error, 'Compensação do upload órfão falhou.')
const preservedDownload = await ownerA.storage.from('maintenance-request-photos').download(preservedPath)
assert(!preservedDownload.error, 'Compensação removeu ou bloqueou a foto preservada.')

const approveVisualRequest = await createRequest(portal, 'Aprovação visual QA')
const rejectVisualRequest = await createRequest(portal, 'Rejeição visual QA')
const convertVisualRequest = await createRequest(portal, 'Conversão visual QA')
await rpc(ownerA, 'internal_approve_maintenance_request', approveArgs(convertVisualRequest))

await mkdir('.tmp', { recursive: true })
await writeFile('.tmp/stage15_browser_fixture.json', JSON.stringify({
  ownerEmail, portalEmail, password, organizationId, locationId,
  approveVisualRequest, rejectVisualRequest, convertVisualRequest,
  convertedRequest: concurrentConversionRequest, convertedMaintenance: conversionResults[0][0].maintenance_id,
}), 'utf8')

console.log(JSON.stringify({
  ok: true,
  tests: {
    'duas conversões realmente concorrentes criam uma OS': true,
    'aprovação e rejeição concorrentes têm vencedor único': true,
    'aprovação e cancelamento concorrentes têm vencedor único': true,
    'registro tardio compensa órfão e preserva foto válida': true,
  },
  ordersAfterConcurrentConversion: convertedOrderCount,
}))

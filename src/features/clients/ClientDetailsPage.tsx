import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { RelevantReturns } from '../returns/RelevantReturns'
import {
  createClientLocation,
  deleteClient,
  deleteClientLocation,
  locationToInput,
  updateClientLocation,
} from './clientApi'
import { ClientLocationForm } from './ClientLocationForm'
import { clientKeys, useClientDetails } from './clientQueries'
import type { ClientLocation, ClientLocationInput } from './types'

type LocationEditor = { mode: 'create' } | { mode: 'edit'; location: ClientLocation }

function formatAddress(location: ClientLocation) {
  const firstLine = [location.street, location.number].filter(Boolean).join(', ')
  const secondLine = [location.neighborhood, `${location.city} / ${location.state}`]
    .filter(Boolean)
    .join(' · ')
  return { firstLine, secondLine }
}

export function ClientDetailsPage() {
  const { clientId } = useParams()
  const routeLocation = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organization, client } = useClientDetails(clientId)
  const [editor, setEditor] = useState<LocationEditor | null>(null)
  const [success, setSuccess] = useState<string | null>(
    (routeLocation.state as { success?: string } | null)?.success ?? null,
  )
  const [archiveClientPending, setArchiveClientPending] = useState(false)
  const [archiveLocationPending, setArchiveLocationPending] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  if (organization.isLoading || client.isLoading) return <PageSkeleton rows={5} />

  const error = organization.error ?? client.error
  if (error || !organization.data || !client.data) {
    return (
      <PageState
        title="Cliente indisponível"
        description={error instanceof Error ? error.message : 'O cliente não foi encontrado.'}
        actionLabel="Voltar para clientes"
        onAction={() => navigate('/app/clientes')}
        tone="error"
      />
    )
  }

  const organizationId = organization.data
  const details = client.data

  async function refreshClient() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(organizationId, details.id),
      }),
    ])
  }

  async function handleLocationSubmit(input: ClientLocationInput) {
    if (editor?.mode === 'edit') {
      await updateClientLocation(organizationId, editor.location.id, input)
      setSuccess('Unidade atualizada com sucesso.')
    } else {
      await createClientLocation(organizationId, details.id, input)
      setSuccess('Unidade adicionada com sucesso.')
    }
    setEditor(null)
    setActionError(null)
    await refreshClient()
  }

  async function handleDeleteClient() {
    setIsArchiving(true)
    setActionError(null)
    try {
      await deleteClient(organizationId, details.id)
      await queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
      navigate('/app/clientes', {
        replace: true,
        state: { success: 'Cliente excluído com sucesso.' },
      })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível excluir o cliente.',
      )
      setIsArchiving(false)
    }
  }

  async function handleDeleteLocation(locationId: string) {
    setIsArchiving(true)
    setActionError(null)
    try {
      await deleteClientLocation(organizationId, locationId)
      setArchiveLocationPending(null)
      setSuccess('Unidade excluída com sucesso.')
      await refreshClient()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível excluir a unidade.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <section className="client-details" aria-labelledby="client-name">
      <Link className="back-link" to="/app/clientes">← Voltar para clientes</Link>

      <div className="client-details__heading">
        <div className="client-details__identity">
          <span className="client-avatar client-avatar--large" aria-hidden="true">
            {details.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">Cadastro ativo</span>
            <h1 id="client-name">{details.name}</h1>
          </div>
        </div>
        <div className="client-details__actions">
          <Link className="secondary-button secondary-button--link" to={`/app/clientes/${details.id}/imprimir`}>
            Ficha imprimível
          </Link>
          <Link className="secondary-button secondary-button--link" to={`/app/clientes/${details.id}/editar`}>
            Editar cadastro
          </Link>
          {!archiveClientPending ? (
            <button className="danger-text-button" type="button" onClick={() => setArchiveClientPending(true)}>
              Excluir cliente
            </button>
          ) : (
            <div className="archive-confirm" role="alert">
              <span>Excluir cliente e todo histórico vinculado?</span>
              <button type="button" onClick={() => void handleDeleteClient()} disabled={isArchiving}>
                {isArchiving ? 'Excluindo…' : 'Sim, excluir definitivamente'}
              </button>
              <button type="button" onClick={() => setArchiveClientPending(false)} disabled={isArchiving}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="action-messages" aria-live="polite">
        {success && <div className="alert alert--success">{success}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}
      </div>

      <div className="client-info-grid">
        <article className="info-card">
          <span className="eyebrow">Contato</span>
          <dl>
            <div><dt>Telefone</dt><dd>{details.phone || 'Não informado'}</dd></div>
            <div><dt>E-mail</dt><dd>{details.email || 'Não informado'}</dd></div>
            <div><dt>Documento</dt><dd>{details.document || 'Não informado'}</dd></div>
          </dl>
        </article>
        <article className="info-card info-card--notes">
          <span className="eyebrow">Observações</span>
          <p>{details.notes || 'Nenhuma observação registrada.'}</p>
        </article>
      </div>

      <RelevantReturns clientId={details.id} />

      <section className="locations-section" aria-labelledby="locations-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Locais de atendimento</span>
            <h2 id="locations-title">Unidades</h2>
          </div>
          {!editor && (
            <button className="primary-button primary-button--compact" type="button" onClick={() => setEditor({ mode: 'create' })}>
              Adicionar unidade <span aria-hidden="true">+</span>
            </button>
          )}
        </div>

        {editor && (
          <ClientLocationForm
            key={editor.mode === 'edit' ? editor.location.id : 'new-location'}
            initialValue={editor.mode === 'edit' ? locationToInput(editor.location) : undefined}
            submitLabel={editor.mode === 'edit' ? 'Salvar unidade' : 'Adicionar unidade'}
            onSubmit={handleLocationSubmit}
            onCancel={() => setEditor(null)}
          />
        )}

        {!editor && details.client_locations.length === 0 && (
          <PageState
            title="Nenhuma unidade cadastrada"
            description="Adicione o primeiro endereço onde este cliente recebe atendimento."
          />
        )}

        {!editor && details.client_locations.length > 0 && (
          <div className="location-list">
            {details.client_locations.map((location) => {
              const address = formatAddress(location)
              const isPending = archiveLocationPending === location.id
              return (
                <article className="location-card" key={location.id}>
                  <div className="location-card__index" aria-hidden="true">
                    {String(details.client_locations.indexOf(location) + 1).padStart(2, '0')}
                  </div>
                  <div className="location-card__body">
                    <h3>{location.name}</h3>
                    <p>{address.firstLine}</p>
                    <span>{address.secondLine}</span>
                    {location.postal_code && <span>CEP {location.postal_code}</span>}
                    {location.complement && <span>{location.complement}</span>}
                    {location.notes && <small>{location.notes}</small>}
                  </div>
                  <div className="location-card__actions">
                    {!isPending ? (
                      <>
                        <button type="button" onClick={() => setEditor({ mode: 'edit', location })}>Editar</button>
                        <button type="button" onClick={() => setArchiveLocationPending(location.id)}>Excluir</button>
                      </>
                    ) : (
                      <div className="archive-confirm archive-confirm--location" role="alert">
                        <span>Excluir unidade definitivamente?</span>
                        <button type="button" onClick={() => void handleDeleteLocation(location.id)} disabled={isArchiving}>
                          {isArchiving ? 'Excluindo…' : 'Sim, excluir'}
                        </button>
                        <button type="button" onClick={() => setArchiveLocationPending(null)} disabled={isArchiving}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { createClient, updateClient } from './clientApi'
import { ClientForm } from './ClientForm'
import { clientKeys, useActiveOrganization, useClientDetails } from './clientQueries'
import type { ClientInput } from './types'

function clientToInput(client: {
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
}): ClientInput {
  return {
    name: client.name,
    phone: client.phone ?? '',
    email: client.email ?? '',
    document: client.document ?? '',
    notes: client.notes ?? '',
  }
}

function FormPageHeading({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="form-page-heading">
      <Link className="back-link" to="/app/clientes">← Voltar para clientes</Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  )
}

export function CreateClientPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const organization = useActiveOrganization()

  if (organization.isLoading) return <PageSkeleton rows={4} />
  if (organization.isError) {
    return (
      <PageState
        title="Organização indisponível"
        description={organization.error.message}
        actionLabel="Tentar novamente"
        onAction={() => void organization.refetch()}
        tone="error"
      />
    )
  }

  return (
    <section className="form-page" aria-labelledby="create-client-title">
      <FormPageHeading eyebrow="Novo registro" title="Cadastrar cliente" />
      <span id="create-client-title" className="sr-only">Cadastrar cliente</span>
      <ClientForm
        submitLabel="Cadastrar cliente"
        onSubmit={async (input) => {
          const id = await createClient(organization.data!, input)
          await queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
          navigate(`/app/clientes/${id}`, {
            replace: true,
            state: { success: 'Cliente cadastrado com sucesso. Agora você pode adicionar unidades.' },
          })
        }}
      />
    </section>
  )
}

export function EditClientPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organization, client } = useClientDetails(clientId)

  if (organization.isLoading || client.isLoading) return <PageSkeleton rows={4} />
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

  return (
    <section className="form-page" aria-labelledby="edit-client-title">
      <FormPageHeading eyebrow="Atualização de cadastro" title="Editar cliente" />
      <span id="edit-client-title" className="sr-only">Editar cliente</span>
      <ClientForm
        initialValue={clientToInput(client.data)}
        submitLabel="Salvar alterações"
        onSubmit={async (input) => {
          await updateClient(organization.data, client.data.id, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() }),
            queryClient.invalidateQueries({
              queryKey: clientKeys.detail(organization.data, client.data.id),
            }),
          ])
          navigate(`/app/clientes/${client.data.id}`, {
            replace: true,
            state: { success: 'Cadastro atualizado com sucesso.' },
          })
        }}
      />
    </section>
  )
}


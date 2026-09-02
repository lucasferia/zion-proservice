import { Link, useNavigate } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { createReturnSchedule } from './returnApi'
import { ReturnScheduleForm } from './ReturnScheduleForm'
import { useReturnScheduleOptions } from './returnQueries'

export function CreateReturnSchedulePage() {
  const navigate = useNavigate()
  const { organization, options } = useReturnScheduleOptions()
  const error = organization.error ?? options.error
  const loading = organization.isLoading || (organization.isSuccess && options.isLoading)

  if (loading) return <PageSkeleton rows={5} />
  if (error || !organization.data || !options.data) return <PageState title="Agenda indisponível" description={error?.message ?? 'Não foi possível carregar os vínculos disponíveis.'} actionLabel="Tentar novamente" onAction={() => void options.refetch()} tone="error" />
  if (options.data.equipment.length === 0) return <PageState title="Cadastre um equipamento primeiro" description="Um retorno precisa apontar para um equipamento ativo." actionLabel="Ir para equipamentos" onAction={() => navigate('/app/equipamentos')} />

  return (
    <section className="return-form-page" aria-labelledby="new-return-title">
      <Link className="back-link" to="/app/agenda">← Voltar para agenda</Link>
      <div className="module-heading"><div><span className="eyebrow">Novo compromisso de campo</span><h1 id="new-return-title">Agendar retorno</h1><p>Registre uma data preventiva ou um acompanhamento combinado com o cliente.</p></div></div>
      <ReturnScheduleForm
        options={options.data}
        onSubmit={async (input) => {
          await createReturnSchedule(organization.data!, input)
          navigate('/app/agenda', { replace: true, state: { success: 'Retorno agendado com sucesso.' } })
        }}
      />
    </section>
  )
}

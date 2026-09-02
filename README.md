# ZION ProService

Sistema web multi-tenant para a operação de manutenção de equipamentos fitness. O MVP cobre clientes e unidades, catálogo geral de equipamentos, estoque, ordens de serviço com consumo transacional de peças, fotos privadas, pagamentos, retornos e dashboard operacional.

## Stack e requisitos

- React 19, TypeScript e Vite
- React Router, TanStack Query e Supabase JS
- Supabase Auth, PostgreSQL com RLS e Storage privado
- Node.js 20 ou superior, npm e um projeto Supabase
- Supabase CLI e Docker para validar o banco localmente

Não há Edge Functions, realtime, modo offline, gateway de pagamento ou geração de PDF no backend neste MVP.

## Configuração local

1. Instale as dependências travadas pelo projeto:

   ```bash
   npm ci
   ```

2. Copie `.env.example` para `.env` e preencha somente estas variáveis públicas:

   ```dotenv
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

3. Inicie o frontend:

   ```bash
   npm run dev
   ```

O frontend nunca deve receber `service_role`, senha do banco ou qualquer chave administrativa. `.env`, `Login.txt` e arquivos locais de credenciais são ignorados pelo Git. Sem as duas variáveis públicas, a aplicação abre em modo seguro e informa que a integração não está configurada.

## Banco, autenticação e Storage

As migrations em `supabase/migrations/` criam a tenancy e todos os módulos do MVP. Cada usuário novo recebe uma organização própria e o papel `owner`; `owner` e `technician` acessam somente organizações em que possuem vínculo ativo. As tabelas de negócio e o bucket privado de fotos usam RLS, vínculos compostos e privilégios mínimos.

Para preparar e validar o banco local:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase db lint --local
```

O reset recria o banco local a partir de todas as migrations; não execute esse comando contra dados de produção. O bucket `maintenance-photos` é privado, aceita JPEG, PNG e WebP de até 10 MB e serve imagens por URLs assinadas temporárias.

## Validação do projeto

Execute antes de publicar:

```bash
npm run lint
npm run test
npm run build
npx supabase db reset
npx supabase test db
npx supabase db lint --local
```

O build de produção fica em `dist/`. O smoke test autenticado deve confirmar, com usuários de teste de organizações distintas:

- login, logout e rota protegida;
- criação e consulta do fluxo cliente → equipamento → OS;
- entrada de estoque e bloqueio de consumo sem saldo;
- upload e leitura de foto privada, sem acesso cross-tenant;
- pagamento parcial/cancelado e faturamento somente de recebidos;
- retorno vencido/hoje e métricas do dashboard no fuso `America/Sao_Paulo`;
- impressão da ficha do cliente e da OS pelo navegador.

## Documentos imprimíveis

Na tela do cliente, use **Ficha imprimível**. Na tela da manutenção, use **Imprimir OS**. As páginas têm layout A4 e CSS `@media print`; o botão **Imprimir** abre o diálogo do navegador, que também permite salvar em PDF. Fotos da OS são carregadas por links privados temporários antes de o botão de impressão ser liberado.

## Deploy

1. Crie ou selecione o projeto Supabase e mantenha as credenciais administrativas fora do repositório.
2. Vincule a CLI e aplique migrations pendentes:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```

3. No provedor do frontend, configure apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como variáveis de build.
4. Na Vercel, use o preset **Vite**, `npm ci` como instalação, `npm run build` como build e `dist` como diretório publicado. O `vercel.json` versionado já redireciona rotas do React Router para `index.html`.
5. Cadastre a URL pública da Vercel em **Authentication → URL Configuration** no Supabase.
6. Execute o smoke test autenticado após o deploy.

Antes de `db push`, revise a lista de migrations com `npx supabase migration list`. Chaves e senhas nunca devem aparecer em scripts, documentação, logs ou commits.

## Identidade e processo

A interface usa o design system Zion: dark mode, azul `#0078D4`, Manrope na UI e Barlow Condensed em títulos e métricas. Os assets oficiais ficam em `Imagens/`. Regras de arquitetura, segurança e fluxo de trabalho estão em `.agents/`.

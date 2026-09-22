# Correção de membership interno

Enquanto não existir um seletor de organização, o índice parcial
`organization_members_one_active_per_user_idx` impede mais de um membership
ativo por usuário. Memberships inativos continuam preservados para histórico.

A migration `20260921000150_cleanup_orphan_organization.sql` suspende, somente
quando todos os fingerprints auditados ainda são válidos, uma organização vazia
criada pelo onboarding antigo e inativa seu último owner sem excluir registros.
Em instalações limpas, a correção de dados é ignorada e somente as proteções
estruturais são aplicadas.

## Reversão futura

A reversão é deliberadamente manual e deve ocorrer em uma nova migration
revisada. A ordem obrigatória é:

1. Remover ou redesenhar a restrição de membership único.
2. Reativar o membership owner da organização suspensa por caminho
   administrativo autorizado.
3. Reativar a organização somente depois de ela possuir owner ativo.

Não reative a organização primeiro e não remova o membership histórico. Quando
o produto ganhar seleção de organização, a restrição parcial deve ser revista
antes de permitir um segundo vínculo ativo.

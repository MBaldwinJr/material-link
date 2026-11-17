# P0 — Segurança e integridade transacional (InterMat / Material Link)

## Status

Branch: `security/p0-auth-atomic-loans` (base `main`).
Este PR **não executa migrations nem altera produção**. Lovable/produção somente devem consumir a branch após revisão, teste em ambiente isolado e janela de implantação.

## Escopo incluído

1. Revoga GRANTs e políticas `anon` legadas nas tabelas de negócios.
2. Adiciona `public.inter_mat_operadores` com roles `admin`, `gestor`, `operador`, `consulta`; autorização é negada por padrão.
3. Restringe leitura a contas autorizadas; catálogo somente administradores e gestores podem editar. Auditoria é consultável por gestor/admin.
4. Bloqueia INSERT/UPDATE/DELETE diretos para empréstimos, devoluções, movimentos e auditoria.
5. Implementa RPCs públicas `SECURITY INVOKER` chamando funções transacionais `SECURITY DEFINER` em schema privado, com validação de `auth.uid()` e membership.
6. Reserva saldo de estoque sem sobrevendê-lo; usa lock da empresa/produto e sequência para numeração.
7. Processa devoluções sob bloqueio do empréstimo, valida quantidade pendente e atualiza estoque e trilha de auditoria atomicamente.
8. Adiciona login Supabase Auth no shell e bloqueia visualização quando a conta não estiver autorizada.
9. Importação de catálogo NÃO substitui o saldo físico de produtos já existentes. Produtos novos ainda podem receber estoque inicial.
10. Registros de empresas/produtos geram trilha de auditoria por trigger, com usuário autenticado.

## Atenção: implantação exige provisionar um administrador

A migration NÃO habilita automaticamente nenhuma conta existente, deliberadamente. Se aplicada sem este passo, TODOS os usuários ficarão sem acesso a dados (fail-closed). Antes da implantação:

- Fazer backup e verificar que o Supabase correto corresponde ao ambiente de destino.
- Confirmar que ao menos uma conta já existe no Supabase Auth e que o e-mail da conta está confirmado.
- Testar migração + login + primeira associação de admin em clone de staging. Não executar testes de escrita em produção.
- Planejar implantação coordenada de aplicação e banco para evitar incompatibilidade temporária: antes da migration o app novo chamará RPCs inexistentes; depois da migration o app antigo tentará gravar diretamente.
- Após aplicar a migration em uma janela controlada, usando SQL Editor autenticado com acesso administrativo, **provisionar o administrador identificado**, nunca um UUID adivinhado ou todos os usuários automaticamente:

```sql
-- Executar apenas APÓS confirmar o e-mail autorizado.
INSERT INTO public.inter_mat_operadores (usuario_id, papel, ativo)
SELECT id, 'admin', true
FROM auth.users
WHERE lower(email) = lower('ADMIN@EXEMPLO.COM')
ON CONFLICT (usuario_id) DO UPDATE SET papel = EXCLUDED.papel, ativo = EXCLUDED.ativo;
-- Conferir que exatamente uma conta foi associada antes de liberar o acesso.
SELECT u.email, m.papel, m.ativo
FROM public.inter_mat_operadores m
JOIN auth.users u ON u.id = m.usuario_id;
```

Após bootstrap, adicionar operadores adicionais com SQL administrativo, mantendo privilégios mínimos. Não permitir que o navegador escreva a tabela de operadores. Desabilitar cadastro público do Auth se o negócio usar apenas usuários convidados.

## Testes

- `tests/p0.security.sql`: contrato de RLS, grants e exposição das RPCs. Somente leitura; executar com `psql -v ON_ERROR_STOP=1 -f tests/p0.security.sql` após aplicar migration no staging.
- `tests/p0.integration.test.mjs`: concorrência real de saída/devolução, validações de estoque, movimentação e anonimato. Cria **dados de teste**: executar APENAS em ambiente descartável com os envs abaixo e a migration instalada.

```bash
export INTERMAT_TEST_WRITES=YES_STAGING_ONLY
export INTERMAT_TEST_SUPABASE_URL=https://SEU-PROJETO-STAGING.supabase.co
export INTERMAT_TEST_SUPABASE_PUBLISHABLE_KEY=...
export INTERMAT_TEST_ADMIN_EMAIL=...
export INTERMAT_TEST_ADMIN_PASSWORD=...
node --test tests/p0.integration.test.mjs
```

Os testes de concorrência esperam UMA criação de empréstimo quando duas solicitações disputam UMA unidade de estoque; depois esperam UMA devolução mesmo com duas solicitações simultâneas. Após executar, remover os registros de teste com conexão administrativa apenas no staging.

Checklist antes do merge: migração aplicada somente no staging; teste SQL passou; concorrência passou; acesso `anon` negado; login de usuário autorizado passou; conta não autorizada não vê dados; produtos existentes não perdem estoque após reimportação; nenhum erro em `build`, `lint` e verificações de tipos; backup e plano de retorno documentados.

## Preservação de produção / retorno

- Não aplicar migration via PR. Não criar projeto remoto automaticamente. Não usar `service_role` no browser.
- Antes de ativar frontend, realizar backup dos dados e das políticas/grants existentes.
- Se houver falha, retornar frontend para versão anterior **somente junto com a estratégia de banco compatível**. Fazer rollback cego das políticas inseguras de `anon` reabre acesso público e não é recomendado.
- A estratégia segura de recuperação é corrigir o defeito sob as políticas restritivas e revalidar. Operação de restauração requer plano separado e aprovação expressa.
- Resíduos de dados históricos (estoque já negativo ou empréstimos com devoluções inconsistentes) precisam ser reconciliados antes de validar as constraints `NOT VALID`; a migration não reescreve dados.
- Em P1, avançar para isolamento por organização/tenant, trilha financeira de trocas/perdas, relatórios e alertas.

## Nota de integridade semântica

Para preservar a semântica atual, os eventos `troca`, `avaria` e `perda` **baixam o saldo pendente** sem retornar mercadorias ao estoque; apenas `total` e `parcial` fazem entrada física. Isso ainda não é contabilidade/financeiro definitivo; exige modelagem própria na P1. O status `atrasado` para empréstimos antigos também precisa de rotina de atualização ou cálculo a partir de prazos.

## Arquivos principais

- `supabase/migrations/20261117184300_p0_security_atomic_ops.sql`
- `src/services/cloud-service.ts`
- `src/integrations/supabase/types.ts`
- `src/components/layout/app-shell.tsx`
- `tests/p0.security.sql`
- `tests/p0.integration.test.mjs`

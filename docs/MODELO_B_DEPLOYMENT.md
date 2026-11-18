# Material Link — Implantação do Modelo B

**Última atualização:** 18/11/2026 (UTC). **Status:** código MVP implementado e testado em PostgreSQL descartável; **não ativado na instância real**.

## Condições que já estão resolvidas

- [x] Organização por CNPJ e conta de usuário com e-mail confirmado; empresa inicia `pendente`
- [x] Colaboradores convidados por token de uso único, associado a e-mail verificado e papel por empresa
- [x] Parcerias entre duas empresas; convite e aceite
- [x] Catálogo/estoque privados e vitrine de produtos publicados opt-in
- [x] Solicitação, aceite, reserva, expedição, confirmação do tomador, devolução e confirmação do cedente
- [x] Lançamento transacional de estoque apenas na cedente; custódia do tomador separada
- [x] RLS entre A/B/C, negação de acesso a terceiros e revogação imediata de membros
- [x] Conflito de estoque e concorrência comprovados com sessões PostgreSQL paralelas
- [x] Convite, idempotência, estoque, auditoria, legado e TypeScript/build verificados no GitHub Actions
- [x] Bloqueio das antigas políticas `FOR ALL TO anon` em migration, mantendo os dados de origem
- [x] Importador de catálogo legado com mapeamento e marcação de saldos negativos
- [x] Interface `/rede` para fluxo operacional e redirecionamento das telas unilaterais

## O que ainda não está entregue como funcionalidade de produção

- Acesso administrativo ao Supabase **original** `sskjqromwluuzohnephz`, identificado na configuração de frontend, mas ausente das contas Supabase conectadas.
- Migrações aplicadas e validadas **na instância real**; o GitHub Actions utiliza banco PostgreSQL descartável e não toca produção.
- Cadastro do primeiro proprietário real confirmado e verificação administrativa da empresa (CNPJ).
- Associação comprovada dos 3.964 produtos originais à organização proprietária; existem 28 saldos negativos e um empréstimo histórico inconsistente que devem ser reconciliados.
- Testes end-to-end com navegador real e duas empresas reais, incluídos pagamentos, anotações fiscais, fotos, documentos e notificações.
- Negociação com contrapropostas de múltiplos itens, avaria, perda, troca, compensação financeira, cobrança e integração com ERPs.
- Auditoria jurídica/fiscal das operações de empréstimo entre empresas.

**Não anunciar o produto como plataforma de rede em produção até o cutover estar aprovado.**

## Como a implantação deve ocorrer

1. Conectar de forma legítima o projeto Supabase real e obter connection string PostgreSQL administrativa por canal seguro. **Nunca colocar senha em chat, arquivos do repositório ou GitHub Actions sem secret manager.**
2. Antes de mudar qualquer schema, fazer backup verificável das tabelas antigas (1 empresa, 3.964 produtos, 1 empréstimo, 1 devolução, 2 movimentações e 3 eventos de auditoria na última consulta).
3. Restaurar snapshot em ambiente de staging ou PostgreSQL local com Auth compatível.
4. Aplicar migrations na ordem:
   - `20261118001000_rede_model_b_core.sql` — organizações, members, parceria, estoque, vitrine, empréstimo e RLS
   - `20261118001100_rede_model_b_actions.sql` — RPCs transacionais e onboarding
   - `20261118001200_rede_convites_membros.sql` — convites de colaboradores
   - `20261118001300_rede_lockdown_legacy.sql` — revoga acesso público antigo (somente junto ao corte do frontend)
   - `20261118001400_rede_legacy_import_tracking.sql` — trilha de importação do legado
5. Em staging, usar duas contas Auth com e-mail confirmado; o administrador deve confirmar propriedade do CNPJ. O cadastro em `/rede` gera organização com status `pendente`.
6. **Somente após verificação externa da propriedade da empresa**, um operador com acesso SQL administrativo pode ativar a organização pelo script:
   ```bash
   psql "$MATERIAL_LINK_DB_URL" -X -v ON_ERROR_STOP=1 \
     -v CNPJ='CNPJ_VALIDADO' \
     -v CONFIRMED_OWNER_EMAIL='conta-confirmada@empresa.com.br' \
     -f scripts/rede-verify-organization.sql
   ```
   O script exige associação de proprietário e e-mail confirmado. A verificação empresarial em si é uma tarefa de governança, não acontece automaticamente.
7. Depois de confirmar documentalmente a proprietária do **catálogo legado**, importar sem excluir nem alterar as linhas de origem:
   ```bash
   psql "$MATERIAL_LINK_DB_URL" -X -v ON_ERROR_STOP=1 \
     -v OWNER_CNPJ='CNPJ_PROPRIETARIO_DO_CATALOGO' \
     -f scripts/rede-import-legacy-products.sql
   ```
   Saldos antigos negativos são mapeados com valor original preservado e saldo disponível 0, **marcados para conciliação**. O importador falha se houver conflito de SKU, valores históricos inadequados ou inconsistência de contagem.
8. Validar `/rede` com A/B/C no staging, incluindo conta não membro, leitura cruzada, convite, 1 produto, 1 empréstimo, expedição, devolução e auditoria.
9. Coordenar publicação do frontend e migration na mesma janela. **Não publicar o novo frontend antes das migrations**: a tela exibirá o aviso de configuração pendente.
10. Conferir originais preservados, permissões e dados importados; liberar acesso a empresas parceiras de forma gradual.

## Comandos de homologação em ambiente descartável

Os workflows `.github/workflows/quality.yml` e `.github/workflows/model-b-mvp.yml` instalam dependências, verificam TypeScript/build e executam:

- `tests/rede.postgres.bootstrap.sql`: Supabase Auth simulado apenas no CI
- `tests/rede.legacy_lockdown.sql`: permissões antigas revogadas, dados antigos preservados
- `tests/rede.postgres.smoke.sql`: rede A/B/C, parcerias, private stock, contratos e devoluções
- `tests/rede.invites.sql`: convite assinado por conta confirmada, token único e read-only
- `tests/rede.concurrent.py`: operações simultâneas e revogação do vínculo
- `tests/rede.import_integrity.sql`: mapeamento do catálogo e quarentena de saldo negativo

CI não deve receber credenciais de produção. Não foi feita nenhuma chamada de geração, mensagem ou deploy da IA do Lovable.

## Compatibilidade e rollback

- PR unilateral antigo `security/p0-auth-atomic-loans` não deve ser aplicado: os papéis globais causam potencial acesso cruzado entre empresas.
- Os registros antigos não são apagados pelo cutover; suas permissões de acesso público são removidas.
- A nova rota `/rede` substitui os módulos unilaterais, com login e status de organização.
- Para recuperar um cutover mal sucedido, manter políticas restritivas e corrigir o aplicativo; **nunca restaurar policies `FOR ALL TO anon` como atalho**.
- Restore de banco exige backup, janela de manutenção e operação administrativa auditada.

## Próximas funcionalidades após o MVP

1. Contrapropostas, contratos com múltiplos itens e controle documental/assinatura.
2. Ocorrências de avaria/perda/troca, compensação, recebíveis, contas a pagar e conciliação.
3. Notificações, anexos privados, relatórios e integração com ERPs das empresas.
4. Operação SaaS comercial: cobrança de assinatura, suporte, compliance, observabilidade, limites e rate limiting.

**Regra:** concluir autenticação, RLS e validações reais antes de habilitar empresas além do piloto; sem usar créditos da IA do Lovable.

# Roadmap de desenvolvimento — Material Link Modelo B

**Decisão vigente:** rede colaborativa, não ERP unilateral. **Código de base:** PR #1 `security/p0-auth-atomic-loans`, ainda em rascunho. **Regra de custo:** GitHub/GitHub Actions, sem consumo de créditos da IA do Lovable. Nenhuma migration no banco real sem acesso administrativo, backup e aceites.

## Resultado de negócio do MVP

Duas empresas distintas devem conseguir, cada uma com seus funcionários e estoque:

1. criar/verificar suas organizações e administrar membros;
2. firmar uma parceria por convite e aceite;
3. publicar/oferecer um produto sem compartilhar dados internos;
4. solicitar e negociar condições de empréstimo;
5. aceitar bilateralmente, reservar e expedir o material;
6. confirmar recebimento pela tomadora, como **custódia de terceiros**;
7. devolver total ou parcialmente, com confirmação de recebimento da cedente;
8. acompanhar status, prazo, pendência, saldo físico, histórico e notificações em dashboards isolados.

**Caminho vertical inicial:** duas organizações (cedente A e tomadora B), 1 produto, 1 solicitação, 1 aceite, 1 expedição, 1 recebimento, 1 devolução e 1 encerramento, com uma terceira organização C verificando ausência de vazamento.

## Planejamento incremental por milestones

| Marco | Prioridade | Entrega demonstrável | Dependência | Condição de aceite |
|---|---|---|---|---|
| M0 — Decisão e baseline | P0 | ADR, contratos, inventário do legado, suites de segurança | Nenhuma | Escopo Modelo B congelado, PR #1 marcado como não publicável em rede |
| M1 — Fundação multiempresa | P0 | `organizacoes`, `organizacao_membros`, contexto ativo, RBAC por org, RLS, bootstrap | M0 | A/B/C isoladas em todos os dados privados, nenhum acesso por cadastro isolado |
| M2 — Catálogo e rede | P0 | Catálogo por organização, saldos, publicações opt-in, parceria bilateral, convites | M1 | B vê só ofertas autorizadas, nunca custo/estoque privado de A; C não vê nada |
| M3 — Negociação e contrato | P0 | Solicitação, contraproposta, aceite duplo, itens e preço/prazo snapshot | M2 | Somente empresas participantes veem acordo; nenhuma reserva antes de autorização |
| M4 — Logística e inventário bilateral | P0 | Reserva, expedição, recebimento, custódia, devolução e confirmação | M3 | Concorrência, retry e retorno parcial sem saldo negativo ou devolução dupla |
| M5 — Financeiro e divergências | P1 | Avaria, perda, troca, compensação, conciliação e indicadores por parte | M4 | Nenhuma avaria/perda credita estoque utilizável; acordos têm auditoria |
| M6 — Escala, monetização e IA | P2 | Marketplace opt-in, notificações, documentos, integrações ERP, análise de risco | MVP validado | Cada funcionalidade mantém isolamento e critérios de privacidade |

Estimativa relativa para planejamento: M0 ≈ 1 iteração; M1–M2 ≈ 2–4 iterações; M3–M4 ≈ 3–5 iterações; M5 ≈ 2–3 iterações. Uma iteração pode ser tratada como uma sprint de 1–2 semanas, **não uma promessa de prazo**, pois depende de validação de dados e acesso ao Supabase.

## Backlog priorizado, com critérios de pronto

### M0 — Arquitetura e controle de implantação

- **MB-001** [P0] Registrar ADR do Modelo B e atualizar README/PR com impedimento de implantação do modelo unilateral.
- **MB-002** [P0] Inventariar cada tabela, rota, serviço e política de acesso atual; marcar ownership e classificação dos dados.
- **MB-003** [P0] Definir diagramas do contrato bilateral, perfil de dados compartilhados e estados de negócio.
- **MB-004** [P0] Manter CI de PostgreSQL efêmero, teste TypeScript, lint e build; criar fixtures A/B/C.

**Aceite:** nenhum commit para `main` transforma o projeto em rede sem evidência de isolamento. Documentação rastreável no GitHub.

### M1 — Cadastro, tenancy e RLS

- **MB-101** [P0] Criar modelos `organizacoes` e `organizacao_membros`, com papel/estado e PK composta; sem inferir empresa pelo e-mail/domínio.
- **MB-102** [P0] Criar convites para equipe por e-mail confirmado, expiração e token hash; impedir autoelevação e ingresso em organização sem aceite.
- **MB-103** [P0] Criar `useActiveOrganization` e seletor de empresa; query keys com `organizacao_id`; limpar caches no switch/logout.
- **MB-104** [P0] Reescrever RLS de todo dado privado, incluindo catálogo, auditoria, anexos e movimentações; sem membership global.
- **MB-105** [P0] Revisar RPCs `SECURITY DEFINER`, grants e acesso a storage; identidade sempre derivada de `auth.uid()`.
- **MB-106** [P0] Testar múltiplos perfis por empresa, revogação imediata, usuário fora da organização e CNPJ não autorizado.

**Aceite:** 3 organizações A, B e C isoladas; um usuário de A não lê/manipula nada de B, mesmo editando `organizacao_id` em requisição; teste negativo obrigatoriamente passa.

### M2 — Catálogo, disponibilidade e parcerias

- **MB-201** [P0] Converter catálogo `produtos` em `organizacao_produtos` com SKU único somente dentro da organização; preservar código legível.
- **MB-202** [P0] Criar `estoques_organizacao` por local, saldos disponíveis/reservados, e custódia separada.
- **MB-203** [P0] Migração assistida dos 3.964 registros legados somente após confirmação da empresa proprietária; manter mapa de IDs.
- **MB-204** [P0] Criar convite/aceite de parceria, bloqueio e política de visibilidade por par de empresas.
- **MB-205** [P0] Criar vitrine de publicações opt-in; nenhum custo interno ou quantidade exata não publicada.
- **MB-206** [P1] Normalização de unidade e equivalência entre produtos de empresas distintas; começar com correspondência manual.

**Aceite:** A e B conseguem registrar produtos com mesmo código local sem conflito; B pesquisa só publicação expressamente autorizada de A; sem leak de margem/custo/local/estoque.

### M3 — Negociação bilateral

- **MB-301** [P0] Solicitação criada pela tomadora ou oferta criada pela cedente; garantir parceria ativa.
- **MB-302** [P0] Inbox/outbox por organização com notificações de aceite, contraproposta e recusa.
- **MB-303** [P0] Versão otimista, `idempotency_key` e snapshots de item, preço, quantidade, unidade, prazo e responsáveis.
- **MB-304** [P0] Aceite das duas partes como precondição para reserva, expedição e compromisso financeiro.
- **MB-305** [P0] Timelines com usuário, organização, data e ações; notas privadas de cada parte em tabela separada.

**Aceite:** C não consegue ler nem aceitar acordo de A/B; B não pode aceitar em nome de A; mudança de condições invalida aceite anterior até nova aprovação.

### M4 — Entrega, devolução, integridade e reconciliação

- **MB-401** [P0] Lock de linhas e baixa de disponibilidade na cedente após reserva/expedição conforme estado, sem saldo negativo.
- **MB-402** [P0] Comprovante de expedição pela cedente, recebimento pela tomadora, reconciliação de divergência.
- **MB-403** [P0] Custódia de terceiro na tomadora, separada do estoque vendável próprio.
- **MB-404** [P0] Devolução total/parcial; cedente confirma conferência física, só então recreditar estoque.
- **MB-405** [P0] Testes de concorrência entre duas sessões, retries, falha parcial e idempotência em todas as transições.
- **MB-406** [P1] Checklist de entrega, fotos e assinatura; anexos privados por participante.

**Aceite:** sem devolução dupla, estoque duplamente baixado ou crédito de item ainda em trânsito; comprovação auditável de cada evento.

### M5 — Financeiro, risco e relatórios

- **MB-501** [P1] Exposição financeira por par de empresas, limites configuráveis, vencimento e garantia.
- **MB-502** [P1] Avaria e perda com reconhecimento bilateral; título ou compensação como evento próprio.
- **MB-503** [P1] Troca por SKU equivalente com aceite de valor/quantidade/unidade das duas empresas.
- **MB-504** [P1] Dashboard por organização com `emprestei` x `tomei emprestado`, pendências, perdas e tempo médio real.
- **MB-505** [P1] Exportação e eventos de auditoria sem expor dados internos da contraparte.
- **MB-506** [P2] Integração ERP e alertas programados por preferência, consentimento e contrato.

**Aceite:** valores refletidos nos dois lados conforme acordo; perdas/avarias não viram estoque disponível; nenhuma análise cruza dados privados de outras empresas.

## Produto MVP: telas necessárias

1. **Minha organização:** dados da empresa, usuários, permissões, convites e alternar organização.
2. **Minha rede:** empresas conectadas, convites, aceite e bloqueios.
3. **Meu catálogo / meu estoque:** somente produtos, locais, custos e quantidades da organização ativa.
4. **Vitrine de parceiras:** materiais autorizados para publicação; condições e solicitação.
5. **Solicitações:** recebidas, enviadas, contrapropostas, pendências de aceite.
6. **Empréstimos:** aba cedente e aba tomadora; contrato, itens, estados e timeline.
7. **Logística:** expedir, confirmar recebimento, comprovantes.
8. **Devoluções:** preparar, enviar, conferir, confirmar; divergências.
9. **Financeiro e painel:** pendências por papel da empresa, risco e acordos.
10. **Auditoria:** ação, usuário, organização, evento e visibilidade coerente com participação.

## Indicadores do sucesso do produto

- Tempo entre solicitação e aceite; taxa de pedidos aceitos.
- Valor e quantidade em poder de terceiros; percentual devolvido no prazo.
- Quantidade de operações concluídas sem intervenção manual.
- Quantidade de devoluções em disputa e perdas reconhecidas.
- Conformidade de estoque, duplicidade de movimentações (meta: zero).
- Incidentes de acesso cruzado detectados em testes (meta: zero).
- Número de empresas parceiras **ativas** e reutilização da rede.

## Estratégia de branches, PRs e deploy

- PR #1 (`security/p0-auth-atomic-loans` -> `main`) permanece **draft** e **não pode ser integrado como release Modelo B**: seus privilégios globais e RPCs unilaterais precisam ser substituídos.
- Este trabalho de arquitetura fica sobre o PR #1, em uma branch separada e PR empilhado. Planejar PRs menores para M1 (identity+RLS), M2 (catálogo+parcerias), M3/M4 (contrato bilateral).
- Commits e testes no GitHub; usar PostgreSQL efêmero do GitHub Actions. Não criar usuários reais, não implantar migrations no banco original e não consumir créditos de IA do Lovable.
- O banco original `sskjqromwluuzohnephz` não foi identificado nas contas Supabase conectadas. Resolver esse acesso e aprovar backup/corte **antes** da implantação.
- Condição de `merge`: inspeção de RLS de todas as tabelas, provas multiempresa A/B/C, teste de fluxo ponta a ponta e autorização operacional explícita para ativação.

## Decisões comerciais posteriores (não bloqueiam M1)

- Precificação: mensalidade por empresa, por operação ou plano de rede, a validar.
- Se disponibilidade será exata ou apenas indicativa; padrão inicial é **disponibilidade não pública**, opt-in por parceira.
- Prazo de reserva, multa, responsabilidade pelo transporte e compensação serão configuráveis por acordo.
- Integrações fiscais/ERP são futuras; empréstimo de mercadorias pode exigir tratamento contábil e fiscal específico antes da operação real.

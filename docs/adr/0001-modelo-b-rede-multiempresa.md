# ADR-0001 — Material Link como rede colaborativa multiempresa

- **Status:** decisão de produto aprovada (Modelo B); desenho técnico proposto para implementação
- **Data:** 17/11/2026
- **Base de código:** `security/p0-auth-atomic-loans` / PR #1 (rascunho)
- **Ambiente de desenvolvimento:** GitHub e GitHub Actions; sem consumo de créditos da IA do Lovable

## Contexto

O Material Link não é apenas um ERP que registra unilateralmente empréstimos com parceiros. É uma **rede fechada de empresas**, na qual cada empresa mantém sua própria equipe, catálogo e estoque, e duas partes acompanham a mesma solicitação, acordo, expedição, recebimento, devolução e eventual compensação.

O aplicativo atual foi construído com React, TanStack, Supabase Auth/Postgres e Supabase RLS. O PR #1 endurece o acesso anônimo, adiciona papéis e operações de estoque transacionais, porém o vínculo `inter_mat_operadores` é **global**, as policies autorizam leitura ampla para todo operador ativo, `produtos.estoque_atual` é um saldo único e `emprestimos` guarda apenas uma `empresa_id`. **Não isola duas empresas independentes**.

## Decisão

1. **Multi-tenancy com esquema compartilhado:** cada dado operacional privado pertence a uma organização (`organizacao_id`); tabelas de operações compartilhadas registram explicitamente as duas partes (`cedente_organizacao_id` e `tomadora_organizacao_id`).
2. **Autorização por organização:** conta no Supabase Auth é uma identidade, não a permissão. `organizacao_membros` associa usuário a uma ou mais organizações com papel, estado e histórico de aprovação. O seletor de organização no frontend é contexto de navegação, jamais prova de autorização.
3. **Papéis pertencem à organização:** `proprietario`, `administrador`, `comercial`, `estoque`, `financeiro`, `consulta`. Um usuário pode ter papéis diferentes em empresas distintas. Ações exigem permissão específica; não se baseiam apenas no nome do papel.
4. **Parceria bilateral:** uma organização só passa a interagir com outra após convite e aceite explícito (`parcerias`). Um parceiro não ganha acesso a dados internos ou catálogo inteiro.
5. **Catálogo privado, vitrine publicada:** cada empresa controla seus SKUs, custos, preços internos, locais e estoques; publicações na rede são *opt-in* e disponibilizam só descrição, unidade, condições e disponibilidade deliberadamente ofertada. Custo e margem não são compartilhados.
6. **Contrato bilateral:** solicitação, contraproposta e aceite acontecem no registro compartilhado; somente a empresa cedente reserva/expede seu estoque; somente a tomadora confirma recebimento; devolução física só reingressa no estoque disponível da cedente **depois de confirmação pela cedente**.
7. **Posse não é propriedade:** no tomador, materiais recebidos entram em **custódia de terceiros**, e não em estoque próprio disponível para venda. Avaria, perda, troca e compensação são eventos distintos, com concordância entre as partes.
8. **Segurança no banco:** RLS obrigatória em toda tabela exposta e RPCs atômicas em schema privado com `auth.uid()`, checagem de pertencimento e papel das duas partes, `search_path` fixo, grants mínimos, trava de linha, versão/estado e idempotência. Nada de `service_role` no browser.
9. **Eventos imutáveis:** manter histórico por operação com `actor_user_id`, `actor_organizacao_id`, UTC, mudança de estado, dados essenciais e chave de correlação. Auditoria organizacional e dados privados ficam separados.
10. **Preservar legado:** não reatribuir automaticamente 3.964 SKUs, 1 empresa parceira ou movimentações do banco antigo para qualquer nova organização sem confirmação da propriedade. Manter snapshot/backup e reconciliar 28 saldos negativos, além do empréstimo com status inconsistente.
11. **GitHub como fonte de verdade:** desenvolvimento, PRs e testes isolados no GitHub; Lovable apenas visualização opcional, sem usar seus créditos de IA.

## Consequências

- O PR #1 é **base técnica reutilizável**, não release multiempresa. As políticas globais, o esquema e as RPCs precisam de substituição antes de qualquer ativação em rede.
- Para o MVP, usar uma rede **privada por convite**; marketplace aberto, equivalência de produtos entre empresas, integração com ERP e cobranças automáticas são posteriores.
- Um usuário autorizado a ler um empréstimo bilateral **não** fica autorizado a ler estoque/custo privado da contraparte.
- Cada mudança de status depende de papel, organização, transição válida, estoque e confirmação de quem tem autoridade para a ação. A interface reflete permissões, mas não as impõe.
- Não haverá migração da instância real sem administrador inicial confirmado, backup e testes multiempresa completos.

## Alternativas avaliadas

- **Manter o modelo A atual:** mais simples, mas incompatível com a decisão do produto e arriscado para dados de outras lojas.
- **Banco separado por empresa:** isolamento forte, mas torna os acordos entre duas empresas, consultas bilaterais e operação da rede mais complexos/caros no MVP.
- **Uma empresa administradora de toda a rede:** falha no princípio de independência das parceiras.
- **JWT com organização ativa como fonte da verdade:** rejeitado por suscetibilidade a contexto trocado e claims desatualizados. Membership deve ser validado no banco a cada operação.

## Critérios de arquitetura

1. A e B veem somente contratos em que participam; C nunca vê contratos ou notas privadas de A/B.
2. B não vê nem modifica custo, margem, local e estoque bruto de A.
3. Usuário removido da organização perde acesso mesmo tendo um JWT ainda válido.
4. Duas solicitações simultâneas nunca retiram mais unidades do saldo da cedente.
5. Um envio/devolução repetido não gera duplicação; eventos têm chave de idempotência.
6. A cessão, a chegada ao tomador e a volta ao cedente são eventos verificáveis e distintos.
7. Troca, avaria e perda não creditam automaticamente material íntegro ao estoque.
8. Cada usuário só consegue agir em nome da organização a que pertence e com permissão apropriada.

Documentos complementares: `docs/MODELO_B_ARQUITETURA.md`, `docs/MODELO_B_ROADMAP.md`, `docs/MODELO_B_TESTES_E_MIGRACAO.md`.

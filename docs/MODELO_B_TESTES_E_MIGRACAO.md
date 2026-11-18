# Modelo B — Matriz de segurança, testes e migração do legado

> **Documento de aceite, não migration executável.** Nenhuma instrução aqui autoriza acesso ao banco original ou uso de créditos da IA do Lovable.

## 1. Situação comprovada do legado

Última inspeção somente leitura do Material Link no projeto Lovable/Supabase associado à ref `sskjqromwluuzohnephz`:

| Tabela/dado | Contagem / condição |
|---|---|
| Empresas parceiras legadas | 1 |
| Produtos legados | 3.964 |
| Empréstimos legados | 1 |
| Devoluções legadas | 1 |
| Movimentações legadas | 2 |
| Eventos de auditoria | 3 |
| Usuários `auth.users` | 0 |
| Produtos com saldo negativo | 28 |
| Empréstimo inconsistente | `quantidade_devolvida = quantidade = 1`, mas `status = aberto` |

A tabela `empresas` legada representa uma **parceira cadastrada no sistema unilateral**, não prova de quem é a empresa proprietária do catálogo. Não deduzir automaticamente a propriedade. O cadastro Auth inexistente impede a promoção do primeiro administrador sem a criação/validação de identidade.

## 2. Evidências mínimas para homologação multiempresa

Criar três organizações fictícias com identidades verificadas exclusivamente no ambiente descartável:

- **A — cedente:** usuário `A-admin` com papel `administrador` e `A-estoque` com papel `estoque`; dois SKUs, incluindo um com estoque limitado a uma unidade.
- **B — tomadora:** `B-admin` e `B-operador`; cadastro, estoque e custo próprios; parceria ativa apenas com A.
- **C — terceira:** `C-admin` sem parceria com A/B; SKU e custo próprios. Deve ver ZERO registros privados e negociações de A/B.
- **U — usuário multiempresa:** papel `consulta` em A e `estoque` em B; contextos diferentes, sem escalonamento de poderes.
- **X — usuário Auth sem associação:** login válido, nenhuma permissão operacional.

### Autorização e exposição

| ID | Cenário | Resultado obrigatório |
|---|---|---|
| SEC-01 | X faz `SELECT` em organizações, membros, produtos, estoque, empréstimos, audit logs | Nenhum dado privado |
| SEC-02 | C tenta consultar empréstimo entre A/B pelo UUID conhecido | Negado, 0 linhas |
| SEC-03 | C tenta `UPDATE` ou executar RPC com `cedente_id=A` | Rejeitado sem side effects |
| SEC-04 | B consulta custo, preço interno, saldo exato e endereço de estoque privado de A | Não recebe colunas/linhas privadas |
| SEC-05 | B consulta oferta de A após parceria aprovada e publicação opt-in | Recebe somente projeção pública autorizada |
| SEC-06 | B tenta dar aceite ou expedir em nome de A | Rejeitado |
| SEC-07 | A tenta confirmar recebimento ou devolução como tomadora B | Rejeitado |
| SEC-08 | U alterna A->B e consulta dados cached de A | Nenhum dado residual apresentado |
| SEC-09 | U tem papel `consulta` em A e `estoque` em B | Não opera estoque de A nem altera papéis |
| SEC-10 | Membership de A revogada durante sessão válida | Acesso a A negado na próxima leitura/RPC |
| SEC-11 | Convite de B usado por e-mail diferente ou expirado | Não cria membership |
| SEC-12 | Usuário Auth recém-cadastrado tenta criar organização ou promover-se a admin por API direta | Rejeitado sem fluxo aprovado |
| SEC-13 | Conta não membro altera metadados JWT/user_metadata/organização ativa | Sem elevação de privilégios |
| SEC-14 | Membro remove único proprietário/último admin sem substituto | Rejeitado |
| SEC-15 | Membro de A tenta acessar anexo privado de B com caminho conhecido | Negado no Storage/endpoint |
| SEC-16 | `anon` tenta executar função privilegiada ou ler tabela RLS | Negado |
| SEC-17 | SELECT de empréstimo bilateral mostra anotação interna ou custos da cedente | Campo ausente, dados segregados em tabela privada |
| SEC-18 | Injeção de organização diferente via corpo da RPC | Rejeitada, auditoria de tentativa opcional |

### Integridade de operações

| ID | Cenário | Resultado obrigatório |
|---|---|---|
| FLOW-01 | B solicita item publicado por A, A rejeita | Sem reserva, estoque intacto |
| FLOW-02 | B solicita, A contrapropõe, B aceita versão anterior | Rejeitar versão obsoleta; novo aceite obrigatório |
| FLOW-03 | Parceria inativa/bloqueada durante negociação | Novos aceites/expedições rejeitados conforme regra; contratos existentes preservados |
| FLOW-04 | A aprova 2 pedidos concorrentes por 1 unidade | No máximo 1 reserva aceita |
| FLOW-05 | A registra duas vezes mesma expedição com mesma idempotency_key | Um único evento/baixa |
| FLOW-06 | A expede, B ainda não recebeu | Material em trânsito; B não ganha estoque vendável |
| FLOW-07 | B confirma recebimento | Custódia de terceiro incrementada, não estoque próprio |
| FLOW-08 | B solicita devolução 3 unidades quando possui 2 | Rejeitar e não criar movimentação |
| FLOW-09 | B expede devolução, A ainda não confirmou | Não adicionar ao estoque disponível de A |
| FLOW-10 | A confirma 1 de 2 unidades, há retorno parcial | Somente 1 reingressa no estoque A; uma unidade permanece pendente |
| FLOW-11 | Duas confirmações simultâneas do mesmo recebimento | Apenas uma gravação |
| FLOW-12 | Troca por produto equivalente sem aceite de B ou A | Sem alteração de pendência/financeiro |
| FLOW-13 | Avaria/perda declarada | Sem crédito físico íntegro; ocorrência e compensação auditáveis |
| FLOW-14 | Falha durante inserção de evento após baixa de estoque | Rollback total |
| FLOW-15 | Usuário com permissão revogada tenta repetir chamada antiga | Rejeitado mesmo com token ainda válido |
| FLOW-16 | Empréstimo totalmente devolvido ultrapassa prazo | Não reaparece como `atrasado` |
| FLOW-17 | Mais de 1.000 produtos ou operações | Paginação estável, sem omissões ou duplicações |
| FLOW-18 | A cancela reserva ainda não expedida | Saldo reservado liberado exatamente uma vez |
| FLOW-19 | Duas empresas usam mesmo SKU textual | Nenhuma colisão: UNIQUE(`organizacao_id,codigo`) |
| FLOW-20 | Usuário vê contrato de A/B com papéis diferentes em cada organização | Apenas operações autorizadas para organização atuante |

## 3. Provas de isolamento que devem ser executadas

- Testar SELECT, UPDATE, INSERT e DELETE para todas as novas tabelas com JWTs diferentes.
- Repetir os testes de segurança com UUIDs conhecidos da outra empresa para detectar IDOR/BOLA.
- Inspecionar a lista de funções expostas; revogar EXECUTE a `PUBLIC` e `anon` para qualquer função privilegiada.
- Checar `SELECT` e `WITH CHECK` de políticas de UPDATE, inclusive em tabelas de associação.
- Confirmar que views públicas usam `security_invoker=true` (se aplicável) e não retornam colunas internas.
- Testar APIs, URLs privadas de documentos e subscriptions de Realtime com as mesmas regras.
- Garantir que o código cliente não contém chave secreta nem service role.
- Em cada PR: migration numa instância PostgreSQL efêmera; testes de lock, rollback e idempotência, TypeScript/lint/build, sem acesso ao ambiente original.

## 4. Plano de migração sem perda de dados

**Fase de preparação (somente leitura no original)**

1. Confirmar ID do projeto e obter acesso administrativo legítimo ao Supabase; não supor que contas Supabase conectadas pertencem a este projeto.
2. Backup verificável de `public` e, se permitido, configurações de políticas, permissões, schema e Auth. Registrar contagens, checksum de produtos e saldos.
3. Confrontar registros históricos de estoque, empréstimo e devolução, separando inconsistências reais de dados demonstrativos.
4. Identificar com o proprietário humano qual empresa é dona dos produtos importados — não deduzir pelo único registro `empresas`.
5. Preparar roteiro de ativação dos usuários em Auth e membership de administrador com e-mail confirmado.

**Fase de implementação (banco descartável)**

6. Criar novas tabelas de organizações, membros, estoque segregado e contratos bilaterais. Preferir esquema paralelo de rede em vez de alterar destrutivamente o legado.
7. Inserir os dados legados em tabelas de mapeamento com `legacy_id`, `organizacao_id`, `origem` e `migrado_em`.
8. Aplicar políticas RLS para multi-tenant e provar com A/B/C; remover os acessos globais herdados do PR #1.
9. Simular ao menos um empréstimo, uma devolução parcial e uma disputa até encerramento com duas empresas e uma terceira sem acesso.
10. Executar suite de retry/concorrência, rotas e dashboards segregados; revisar custos privados e buckets Storage.

**Corte operacional (somente após aprovação explícita)**

11. Criar primeiro usuário admin confirmado e seu vínculo com a organização correta. Testar recuperação do acesso.
12. Fazer deploy coordenado de frontend, RPCs e policies para não deixar o app antigo escrevendo tabelas agora proibidas.
13. Restaurar/transferir os dados validados com verificação de contagem e saldos; **não** criar lançamentos de estoque compensatórios automáticos para `-28` ou empréstimo inconsistente.
14. Homologar A/B/C no ambiente real e somente depois ativar convites para outras empresas.
15. Manter mecanismo reversível de frontend e snapshot recuperável, sem reabrir policies inseguras para `anon`.

## 5. Bloqueadores atuais

- P0 global em `inter_mat_operadores` não prova tenant isolation.
- `produtos`, `emprestimos`, `devolucoes` e dashboard não associam corretamente cada registro ao seu proprietário e à contraparte.
- Nenhum Auth user no banco original na última inspeção.
- Projeto original ausente das contas Supabase ligadas diretamente; sem autorização administrativa para mudança no banco real.
- 28 produtos com saldo histórico negativo e um empréstimo liquidado com status antigo, que precisam de conciliação sem apagamento.

**Condição de publicação:** só liberar a rede quando SEC-01..18, FLOW-01..20 e auditoria de permissões forem verificáveis por CI e testes manuais no ambiente aprovado. Até lá, PR #1 não é release Modelo B.

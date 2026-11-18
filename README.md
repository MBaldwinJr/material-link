> **Direção atual do produto (17/11/2026): Modelo B — rede colaborativa multiempresa.**
>
> Cada empresa terá conta, membros, catálogo e estoque privativos; empréstimos e
> devoluções ocorrerão mediante negociação e confirmação de ambas as partes.
> A implementação existente é uma base unilateral e **não deve ser implantada
> como rede multiempresa** sem os controles de isolamento previstos.
>
> - Decisão técnica: [ADR-0001](docs/adr/0001-modelo-b-rede-multiempresa.md)
> - Arquitetura alvo: [Modelo B — Arquitetura](docs/MODELO_B_ARQUITETURA.md)
> - Etapas e entregas: [Modelo B — Roadmap](docs/MODELO_B_ROADMAP.md)
> - Segurança e migração: [Modelo B — Testes e Migração](docs/MODELO_B_TESTES_E_MIGRACAO.md)
>
> Desenvolvimento e testes pelo GitHub/GitHub Actions, sem uso de créditos da IA do Lovable.
> Nenhuma migration foi autorizada para o banco original nesta branch.
>
---

# Material Link

Crie um sistema SaaS completo chamado "InterMat - Gestão de Empréstimos de Materiais", voltado para lojas de materiais de construção que realizam empréstimos de mercadorias entre empresas parceiras.

O sistema deve possuir arquitetura moderna, interface profissional, design responsivo e seguir padrões ERP.

====================================================

OBJETIVO

====================================================

Controlar todo o ciclo de empréstimo de materiais entre empresas, evitando perdas, esquecimentos e divergências de estoque.

Todo empréstimo deve impactar automaticamente:

• Estoque

• Financeiro

• Logística

• Histórico

• Dashboard

====================================================

TECNOLOGIAS

====================================================

- React

- TypeScript

- Vite

- TailwindCSS

- shadcn/ui

- Supabase

- PostgreSQL

- Recharts

- React Hook Form

- Zod

- TanStack Query

====================================================

TELA INICIAL

====================================================

Dashboard executivo contendo:

Cards

• Valor total emprestado

• Valor devolvido

• Saldo em aberto

• Quantidade de empréstimos ativos

• Empresas com pendências

• Materiais em atraso

• Produtos mais emprestados

• Empresas com maior volume de empréstimos

Gráficos

• Empréstimos por mês

• Devoluções por mês

• Empresas com maior saldo devedor

• Produtos mais emprestados

• Tempo médio para devolução

====================================================

CADASTRO DE EMPRESAS

====================================================

Campos

Razão Social

Nome Fantasia

CNPJ

Inscrição Estadual

Telefone

WhatsApp

Email

Responsável

Cidade

Estado

Status

Ativa

Suspensa

Bloqueada

Configurações

Limite financeiro para empréstimos

Prazo padrão para devolução

Observações

====================================================

CADASTRO DE PRODUTOS

====================================================

Sincronizado com estoque.

Campos

Código

Código de barras

Descrição

Marca

Categoria

Fornecedor

Unidade

Valor de custo

Valor de venda

Estoque atual

Estoque mínimo

Localização

====================================================

EMPRÉSTIMO

====================================================

Ao criar um empréstimo solicitar:

Empresa

Produto

Quantidade

Valor

Data

Responsável

Motorista

Veículo

Observações

Prazo previsto para devolução

Ao confirmar:

✔ diminuir estoque automaticamente

✔ gerar movimentação financeira

✔ criar saldo da empresa

✔ registrar histórico

✔ gerar documento PDF

✔ gerar QR Code

====================================================

DEVOLUÇÃO

====================================================

Permitir

Devolução total

Devolução parcial

Troca por outro produto

Compensação financeira

Caso devolução parcial:

atualizar saldo automaticamente

Caso troca:

registrar equivalência

Caso dano:

registrar avaria

Caso perda:

transformar em débito financeiro

====================================================

HISTÓRICO DA EMPRESA

====================================================

Timeline completa

Empréstimos

Devoluções

Trocas

Avarias

Perdas

Pagamentos

Saldo atual

Valor movimentado

Tempo médio de devolução

====================================================

FINANCEIRO

====================================================

Criar automaticamente:

Conta:

Materiais em poder de terceiros

Mostrar

Saldo

Limite utilizado

Valor pendente

Histórico financeiro

Recebimentos

Cobranças

====================================================

ESTOQUE

====================================================

Todo empréstimo reduz estoque.

Toda devolução aumenta estoque.

Registrar:

Movimentação

Usuário

Data

Hora

Empresa

Produto

Quantidade

====================================================

LOGÍSTICA

====================================================

Cadastrar

Motoristas

Veículos

Rotas

Entrega

Retirada

Comprovante de entrega

Assinatura digital

Foto

Geolocalização

====================================================

NOTIFICAÇÕES

====================================================

Enviar alertas quando:

material estiver há mais de X dias emprestado

empresa ultrapassar limite

produto estiver em falta

existirem devoluções vencidas

empresa possuir muitas pendências

====================================================

DASHBOARD GERENCIAL

====================================================

Indicadores

Valor emprestado hoje

Semana

Mês

Ano

Produtos mais emprestados

Empresas mais confiáveis

Empresas com maior atraso

Produtos nunca devolvidos

Valor parado

Capital empatado

====================================================

RELATÓRIOS

====================================================

Por empresa

Por produto

Por período

Por usuário

Por motorista

Por veículo

Por cidade

Por fornecedor

Exportar

PDF

Excel

CSV

====================================================

PERMISSÕES

====================================================

Administrador

Gerente

Estoque

Financeiro

Motorista

Consulta

Cada perfil deve visualizar apenas os módulos autorizados.

====================================================

AUDITORIA

====================================================

Registrar absolutamente tudo:

Usuário

Data

Hora

IP

Alterações

Inclusões

Exclusões

Motivo

====================================================

IA (COPILOTO)

====================================================

Criar um Copiloto Inteligente que:

analise o histórico de empréstimos

identifique empresas que atrasam devoluções

calcule o risco de novos empréstimos

sugira limites de crédito por empresa

detecte materiais com alta recorrência de empréstimos

identifique possíveis perdas de estoque

gere previsões de reposição considerando os materiais emprestados

gere alertas preventivos antes do vencimento

responda perguntas como:

"Qual empresa está com maior saldo devedor?"

"Quanto temos emprestado em tintas?"

"Quais materiais estão há mais de 60 dias fora do estoque?"

"Qual foi o prejuízo com materiais não devolvidos este ano?"

====================================================

AUTOMAÇÕES

====================================================

Automatizar:

✔ baixa no estoque

✔ atualização do saldo da empresa

✔ geração de PDFs

✔ envio de e-mails

✔ envio de WhatsApp

✔ emissão de comprovantes

✔ geração de QR Code

✔ lembretes automáticos

✔ cobrança automática após vencimento

====================================================

BANCO DE DADOS

====================================================

Modelar tabelas normalizadas para:

empresas

produtos

categorias

estoque

movimentacoes_estoque

emprestimos

itens_emprestimo

devolucoes

itens_devolucao

usuarios

permissoes

motoristas

veiculos

rotas

historico

financeiro

contas

anexos

notificacoes

auditoria

====================================================

DIFERENCIAL

====================================================

O sistema deve funcionar como um ERP especializado em empréstimos entre empresas de materiais de construção, com foco em rastreabilidade total, integração entre estoque, logística e financeiro, automações inteligentes e um Copiloto de IA para apoiar decisões, reduzir perdas e melhorar o controle operacional.

O código deve seguir boas práticas de arquitetura, componentes reutilizáveis, tipagem forte, segurança (RLS no Supabase), desempenho e escalabilidade para múltiplas empresas (multi-tenant).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25773428-9827-4a5f-9281-1f98a07cee9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

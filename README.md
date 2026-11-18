# Material Link — rede colaborativa de empréstimos entre empresas

**Modelo B:** cada empresa possui contas, funcionários, estoque e catálogo independentes. Empresas parceiras compartilham apenas ofertas publicadas e os termos das negociações de que participam. Toda saída, recebimento e devolução é confirmada pela parte autorizada.

## Estado do projeto

A implementação do **MVP multiempresa** está disponível na branch `feat/model-b-network-mvp`: banco com RLS por organização, convites vinculados a e-mail, parcerias, catálogo privado, ofertas, empréstimos bilaterais, custódia e devoluções transacionais. Interface em `/rede`. A navegação unilateral antiga redireciona para a rede.

**Importante:** código validado no banco descartável de GitHub Actions **não significa produção ativada**. As migrations ainda precisam ser instaladas no Supabase original com acesso administrativo e um corte coordenado. O catálogo histórico precisa de associação confirmada à sua empresa. Não usar créditos da IA do Lovable.

## Rodar localmente

Requisitos: Bun/Node compatível com o lockfile do projeto.

```bash
git clone https://github.com/MBaldwinJr/material-link.git
cd material-link
bun install --frozen-lockfile
bun run dev
```

Configure o Supabase por variáveis de ambiente padrão do projeto (`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`). **Nunca inclua `service_role`, secret keys ou senha de banco no código/frontend.**

O primeiro cadastro cria a organização como `pendente`. A validação do CNPJ e a confirmação de empresa proprietária devem ocorrer por processo administrativo confiável, antes de habilitar negociações.

## Arquitetura

| Componente | Tecnologia e responsabilidade |
|---|---|
| Interface | React, TanStack Router, Tailwind, componentes reutilizáveis |
| Identidade | Supabase Auth; email confirmado, identidade do usuário |
| Tenancy | PostgreSQL: `rede_organizacoes`, `rede_membros`, RLS por associação |
| Rede | `rede_parcerias`, `rede_ofertas` com publicação voluntária |
| Operações | RPC `rede_operar` com ações e controle por papel e organização |
| Integridade | Transações, locks, versionamento, idempotência e eventos |
| Estoque | Saldos privados da cedente, reserva, remessa e custódia da tomadora |
| Validação | GitHub Actions, PostgreSQL 17 descartável com casos A/B/C |

### Documentação

- [Arquitetura do Modelo B](docs/MODELO_B_ARQUITETURA.md)
- [Roadmap](docs/MODELO_B_ROADMAP.md)
- [Testes de isolamento e migração](docs/MODELO_B_TESTES_E_MIGRACAO.md)
- [Implantação e restrições de produção](docs/MODELO_B_DEPLOYMENT.md)
- [Decisão de arquitetura](docs/adr/0001-modelo-b-rede-multiempresa.md)
- [Brief original / histórico](docs/LEGACY_BRIEF.md)

## Segurança e homologação

Os usuários de uma organização não recebem permissão de leitura de produtos/custos/estoque privados de terceiros. Empréstimos e eventos ficam visíveis somente às empresas participantes. Um cadastro Auth não concede, por si só, papel em nenhuma organização.

A autenticação e as permissões devem ser verificadas **no PostgreSQL** em todas as operações; permissões visuais da interface são apenas orientação ao usuário. Operações são feitas por funções de transação com checagem de `auth.uid()` e membership vigente, nunca por UPDATE direto do browser.

Os testes de CI reconstruem a versão insegura do legado em banco temporário, bloqueiam acesso público, e exercitam os fluxos A/B/C, convites, concorrência, revogação e preservação do catálogo.

## Escopo não implementado neste MVP

Compensações financeiras e cobranças, trocas/avarias/perdas complexas, contraproposta de múltiplos itens, documentos com assinatura, emissão fiscal, integração ERP, marketplace aberto e IA operacional serão tratados em marcos futuros. Esses módulos **não** devem ser descritos como concluídos.

## Preservação do histórico

O banco de origem possui produtos importados e registros de teste/históricos. A migração de catálogo depende da comprovação de qual organização é a titular dos SKUs. O utilitário `scripts/rede-import-legacy-products.sql` mantém os registros originais, cria um mapa de IDs e marca estoques negativos para conciliação, sem inventar entradas físicas.

**Não aplicar migrations no banco real sem backup verificado, administrador autorizado, testes de staging e implantação coordenada.**

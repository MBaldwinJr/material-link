import { supabase } from "@/integrations/supabase/client";
import type { 
  Empresa, 
  EmpresaStatus, 
  Produto, 
  Emprestimo, 
  Devolucao, 
  MovimentacaoEstoque,
  Motorista,
  Veiculo,
  RegistroAuditoria,
  DevolucaoTipo,
  EmprestimoStatus
} from "@/types/domain";

export interface EmpresaInput extends Omit<Empresa, "id" | "criadoEm"> {}
export interface ProdutoInput extends Omit<Produto, "id"> {}
export interface EmprestimoInput {
  readonly empresaId: string;
  readonly produtoId: string;
  readonly quantidade: number;
  readonly valorUnitarioCentavos: number;
  readonly data: string;
  readonly prazoDevolucao: string;
  readonly responsavel: string;
  readonly motorista: string;
  readonly veiculo: string;
  readonly observacoes: string;
}
export interface DevolucaoInput {
  readonly emprestimoId: string;
  readonly tipo: DevolucaoTipo;
  readonly quantidade: number;
  readonly responsavel: string;
  readonly observacoes: string;
}

// Utility to convert snake_case (DB) to camelCase (Domain)
function mapEmpresa(row: any): Empresa {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    inscricaoEstadual: row.inscricao_estadual,
    telefone: row.telefone,
    whatsapp: row.whatsapp,
    email: row.email,
    responsavel: row.responsavel,
    cidade: row.cidade,
    estado: row.estado,
    status: row.status as EmpresaStatus,
    limiteCentavos: Number(row.limite_centavos),
    prazoPadraoDias: row.prazo_padrao_dias,
    observacoes: row.observacoes,
    criadoEm: row.criado_em,
  };
}

function mapProduto(row: any): Produto {
  return {
    id: row.id,
    codigo: row.codigo,
    codigoBarras: row.codigo_barras,
    descricao: row.descricao,
    marca: row.marca,
    categoria: row.categoria,
    fornecedor: row.fornecedor,
    unidade: row.unidade,
    custoCentavos: Number(row.custo_centavos),
    vendaCentavos: Number(row.venda_centavos),
    estoqueAtual: Number(row.estoque_atual),
    estoqueMinimo: Number(row.estoque_minimo),
    localizacao: row.localizacao,
  };
}

function mapEmprestimo(row: any): Emprestimo {
  const pendente = Number(row.quantidade) - Number(row.quantidade_devolvida);
  const devolvido = Number(row.quantidade_devolvida);
  // Derive visible status from quantities and deadline. Historic rows may
  // retain an obsolete DB status, but must not be reported as outstanding.
  const status: EmprestimoStatus =
    pendente <= 0 ? "devolvido" :
    new Date(row.prazo_devolucao).getTime() < Date.now() ? "atrasado" :
    devolvido > 0 ? "parcial" : "aberto";

  return {
    id: row.id,
    numero: row.numero,
    empresaId: row.empresa_id,
    produtoId: row.produto_id,
    quantidade: Number(row.quantidade),
    quantidadeDevolvida: Number(row.quantidade_devolvida),
    valorUnitarioCentavos: Number(row.valor_unitario_centavos),
    data: row.data,
    prazoDevolucao: row.prazo_devolucao,
    responsavel: row.responsavel,
    motorista: row.motorista,
    veiculo: row.veiculo,
    observacoes: row.observacoes,
    status,
  };
}

export async function listEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .order("nome_fantasia");
  if (error) throw error;
  return (data || []).map(mapEmpresa);
}

export async function getEmpresa(id: string): Promise<Empresa> {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapEmpresa(data);
}

export async function createEmpresa(input: any): Promise<Empresa> {
  const payload = {
    razao_social: input.razaoSocial,
    nome_fantasia: input.nomeFantasia,
    cnpj: input.cnpj,
    inscricao_estadual: input.inscricaoEstadual,
    telefone: input.telefone,
    whatsapp: input.whatsapp,
    email: input.email,
    responsavel: input.responsavel,
    cidade: input.cidade,
    estado: input.estado,
    status: input.status,
    limite_centavos: input.limiteCentavos,
    prazo_padrao_dias: input.prazoPadraoDias,
    observacoes: input.observacoes,
  };

  const { data, error } = await supabase
    .from("empresas")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapEmpresa(data);
}

export async function updateEmpresa(id: string, input: any): Promise<Empresa> {
  const payload = {
    razao_social: input.razaoSocial,
    nome_fantasia: input.nomeFantasia,
    cnpj: input.cnpj,
    inscricao_estadual: input.inscricaoEstadual,
    telefone: input.telefone,
    whatsapp: input.whatsapp,
    email: input.email,
    responsavel: input.responsavel,
    cidade: input.cidade,
    estado: input.estado,
    status: input.status,
    limite_centavos: input.limiteCentavos,
    prazo_padrao_dias: input.prazoPadraoDias,
    observacoes: input.observacoes,
  };

  const { data, error } = await supabase
    .from("empresas")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapEmpresa(data);
}

// PostgREST imposes a server-side row limit (commonly 1,000).
// Fetch every page with a stable tie-breaker so imported ERP catalogs
// larger than the API limit remain searchable for material loans.
export async function listProdutos(): Promise<Produto[]> {
  const batchSize = 500;
  const produtos: Produto[] = [];

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("descricao", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    produtos.push(...batch.map(mapProduto));

    if (batch.length < batchSize) break;
  }

  return produtos;
}

export async function createProduto(input: any): Promise<Produto> {
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      codigo: input.codigo,
      codigo_barras: input.codigoBarras,
      descricao: input.descricao,
      marca: input.marca,
      categoria: input.categoria,
      fornecedor: input.fornecedor,
      unidade: input.unidade,
      custo_centavos: input.custoCentavos,
      venda_centavos: input.vendaCentavos,
      estoque_atual: input.estoqueAtual,
      estoque_minimo: input.estoqueMinimo,
      localizacao: input.localizacao,
    })
    .select()
    .single();
  if (error) throw error;
  return mapProduto(data);
}

export async function listEmprestimos(): Promise<Emprestimo[]> {
  const batchSize = 500;
  const emprestimos: Emprestimo[] = [];

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from("emprestimos")
      .select("*")
      .order("data", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    emprestimos.push(...batch.map(mapEmprestimo));
    if (batch.length < batchSize) break;
  }

  return emprestimos;
}

// A single PostgreSQL RPC performs all writes atomically and authorizes the
// signed-in operator. Never recreate a read-modify-write stock flow here.
export async function createEmprestimo(input: EmprestimoInput): Promise<Emprestimo> {
  const { data, error } = await supabase.rpc("registrar_emprestimo_seguro", {
    p_empresa_id: input.empresaId,
    p_produto_id: input.produtoId,
    p_quantidade: input.quantidade,
    p_valor_unitario_centavos: input.valorUnitarioCentavos,
    p_data: input.data,
    p_prazo_devolucao: input.prazoDevolucao,
    p_responsavel: input.responsavel,
    p_motorista: input.motorista,
    p_veiculo: input.veiculo,
    p_observacoes: input.observacoes,
  });
  if (error) throw error;
  if (!data) throw new Error("O empréstimo não foi confirmado pelo servidor.");
  return mapEmprestimo(data);
}

export async function registrarDevolucao(input: DevolucaoInput): Promise<Devolucao> {
  const { data, error } = await supabase.rpc("registrar_devolucao_segura", {
    p_emprestimo_id: input.emprestimoId,
    p_tipo: input.tipo,
    p_quantidade: input.quantidade,
    p_responsavel: input.responsavel,
    p_observacoes: input.observacoes,
  });
  if (error) throw error;
  if (!data) throw new Error("A devolução não foi confirmada pelo servidor.");
  return {
    id: data.id,
    emprestimoId: data.emprestimo_id,
    tipo: data.tipo as DevolucaoTipo,
    quantidade: Number(data.quantidade),
    data: data.data,
    responsavel: data.responsavel || "",
    observacoes: data.observacoes || "",
  };
}

export async function listDevolucoes(): Promise<Devolucao[]> {
  const batchSize = 500;
  const devolucoes: Devolucao[] = [];

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from("devolucoes")
      .select("*")
      .order("data", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    devolucoes.push(...batch.map((row) => ({
      id: row.id,
      emprestimoId: row.emprestimo_id,
      tipo: row.tipo as DevolucaoTipo,
      quantidade: Number(row.quantidade),
      data: row.data,
      responsavel: row.responsavel || "",
      observacoes: row.observacoes || "",
    })));
    if (batch.length < batchSize) break;
  }

  return devolucoes;
}

export async function importProdutos(
  rows: readonly any[],
  _origem: string,
): Promise<{ criados: number; atualizados: number }> {
  let criados = 0;
  let atualizados = 0;

  for (const row of rows) {
    const { data: existing } = await supabase
      .from("produtos")
      .select("id")
      .eq("codigo", row.codigo)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("produtos")
        .update({
          codigo_barras: row.codigoBarras,
          descricao: row.descricao,
          marca: row.marca,
          categoria: row.categoria,
          fornecedor: row.fornecedor,
          unidade: row.unidade,
          custo_centavos: row.custoCentavos,
          venda_centavos: row.vendaCentavos,
          // Existing physical stock is authoritative: importing a catalog
          // must not silently replace the balance affected by loans/returns.
          estoque_minimo: row.estoqueMinimo,
          localizacao: row.localizacao,
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
      atualizados++;
    } else {
      const { error: insertError } = await supabase
        .from("produtos")
        .insert({
          codigo: row.codigo,
          codigo_barras: row.codigoBarras,
          descricao: row.descricao,
          marca: row.marca,
          categoria: row.categoria,
          fornecedor: row.fornecedor,
          unidade: row.unidade,
          custo_centavos: row.custoCentavos,
          venda_centavos: row.vendaCentavos,
          estoque_atual: row.estoqueAtual,
          estoque_minimo: row.estoqueMinimo,
          localizacao: row.localizacao,
        });
      if (insertError) throw insertError;
      criados++;
    }
  }
  return { criados, atualizados };
}

export async function getDashboardData() {
  // Reuse paginated history; a 1,000-row REST cap must not distort KPIs.
  const [loans, returns] = await Promise.all([listEmprestimos(), listDevolucoes()]);
  const loanById = new Map(loans.map((loan) => [loan.id, loan]));
  const physicalReturns = returns.filter((event) => event.tipo === "total" || event.tipo === "parcial");

  const totalEmprestado = loans.reduce(
    (sum, loan) => sum + loan.quantidade * loan.valorUnitarioCentavos, 0
  );
  const totalDevolvido = physicalReturns.reduce((sum, event) => {
    const loan = loanById.get(event.emprestimoId);
    return sum + event.quantidade * (loan?.valorUnitarioCentavos ?? 0);
  }, 0);
  const emAberto = loans.filter((loan) => loan.quantidade > loan.quantidadeDevolvida);
  const now = Date.now();
  const atrasados = emAberto.filter((loan) =>
    new Date(loan.prazoDevolucao).getTime() < now
  );

  const durations = physicalReturns.flatMap((event) => {
    const loan = loanById.get(event.emprestimoId);
    if (!loan) return [];
    const days = (new Date(event.data).getTime() - new Date(loan.data).getTime()) / 86_400_000;
    return Number.isFinite(days) && days >= 0 ? [days] : [];
  });
  const tempoMedioDevolucaoDias = durations.length > 0
    ? Math.round(durations.reduce((sum, days) => sum + days, 0) / durations.length)
    : 0;

  // Real month-by-month loan and physical return values.
  const monthly = new Map<string, { mes: string; emprestimos: number; devolucoes: number }>();
  const addMonth = (date: string, column: "emprestimos" | "devolucoes", cents: number) => {
    const time = new Date(date).getTime();
    if (!Number.isFinite(time)) return;
    const mes = new Date(time).toISOString().slice(0, 7);
    const item = monthly.get(mes) ?? { mes, emprestimos: 0, devolucoes: 0 };
    item[column] += cents / 100;
    monthly.set(mes, item);
  };
  for (const loan of loans) {
    addMonth(loan.data, "emprestimos", loan.quantidade * loan.valorUnitarioCentavos);
  }
  for (const event of physicalReturns) {
    const loan = loanById.get(event.emprestimoId);
    if (loan) addMonth(event.data, "devolucoes", event.quantidade * loan.valorUnitarioCentavos);
  }
  const serie = [...monthly.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12)
    .map((item) => ({
      ...item,
      emprestimos: Math.round(item.emprestimos),
      devolucoes: Math.round(item.devolucoes),
    }));

  // Rank only referenced identifiers; do not download thousands of catalog rows.
  const debtByCompany = new Map<string, number>();
  for (const loan of emAberto) {
    debtByCompany.set(loan.empresaId, (debtByCompany.get(loan.empresaId) ?? 0)
      + (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos);
  }
  const topCompanies = [...debtByCompany.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const companyNames = new Map<string, string>();
  if (topCompanies.length > 0) {
    const { data, error } = await supabase.from("empresas")
      .select("id, nome_fantasia").in("id", topCompanies.map(([id]) => id));
    if (error) throw error;
    for (const item of data ?? []) companyNames.set(item.id, item.nome_fantasia);
  }
  const rankingEmpresas = topCompanies.map(([id, cents]) => ({
    nome: companyNames.get(id) ?? "Empresa",
    valor: Math.round(cents / 100),
  }));

  const quantityByProduct = new Map<string, number>();
  for (const loan of loans) {
    quantityByProduct.set(loan.produtoId,
      (quantityByProduct.get(loan.produtoId) ?? 0) + loan.quantidade);
  }
  const topProducts = [...quantityByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const productNames = new Map<string, string>();
  if (topProducts.length > 0) {
    const { data, error } = await supabase.from("produtos")
      .select("id, descricao").in("id", topProducts.map(([id]) => id));
    if (error) throw error;
    for (const item of data ?? []) productNames.set(item.id, item.descricao);
  }
  const rankingProdutos = topProducts.map(([id, valor]) => ({
    nome: productNames.get(id) ?? "Produto",
    valor,
  }));

  return {
    metrics: {
      totalEmprestadoCentavos: totalEmprestado,
      totalDevolvidoCentavos: totalDevolvido,
      saldoAbertoCentavos: emAberto.reduce((sum, loan) =>
        sum + (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos, 0),
      emprestimosAtivos: emAberto.length,
      empresasComPendencia: new Set(emAberto.map((loan) => loan.empresaId)).size,
      materiaisEmAtraso: atrasados.reduce((sum, loan) =>
        sum + (loan.quantidade - loan.quantidadeDevolvida), 0),
      tempoMedioDevolucaoDias,
      capitalParadoCentavos: atrasados.reduce((sum, loan) =>
        sum + (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos, 0),
    },
    serie,
    rankingEmpresas,
    rankingProdutos,
  };
}

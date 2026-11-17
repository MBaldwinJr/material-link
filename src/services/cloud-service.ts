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
  DevolucaoTipo
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
    status: row.status as any,
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

export async function listProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("descricao");
  if (error) throw error;
  return (data || []).map(mapProduto);
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
  const { data, error } = await supabase
    .from("emprestimos")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapEmprestimo);
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
  const { data, error } = await supabase
    .from("devolucoes")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    emprestimoId: row.emprestimo_id,
    tipo: row.tipo as any,
    quantidade: Number(row.quantidade),
    data: row.data,
    responsavel: row.responsavel || '',
    observacoes: row.observacoes || ''
  }));
}

export async function importProdutos(
  rows: readonly any[],
  origem: string,
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
  const { data: loans } = await supabase.from("emprestimos").select("*");
  const { data: companies } = await supabase.from("empresas").select("id, nome_fantasia");
  const { data: products } = await supabase.from("produtos").select("id, descricao");
  const { data: returns } = await supabase.from("devolucoes").select("*");

  const l = (loans || []).map(mapEmprestimo);
  const totalEmprestado = l.reduce((s, x) => s + (x.quantidade * x.valorUnitarioCentavos), 0);
  const totalDevolvido = l.reduce((s, x) => s + (x.quantidadeDevolvida * x.valorUnitarioCentavos), 0);
  const emAberto = l.filter(x => x.status !== 'devolvido');
  const atrasados = l.filter(x => x.status === 'atrasado');

  // Simple series for chart
  const serie = [
    { mes: "Atual", emprestimos: Math.round(totalEmprestado/100), devolucoes: Math.round(totalDevolvido/100) }
  ];

  const rankingEmpresas = (companies || []).map(c => {
    const valor = l.filter(loan => loan.empresaId === c.id && loan.status !== 'devolvido')
                   .reduce((s, loan) => s + (loan.quantidade - loan.quantidadeDevolvida) * loan.valorUnitarioCentavos, 0);
    return { nome: c.nome_fantasia, valor: Math.round(valor / 100) };
  }).sort((a,b) => b.valor - a.valor).slice(0, 5);

  const rankingProdutos = (products || []).map(p => {
    const valor = l.filter(loan => loan.produtoId === p.id).reduce((s, x) => s + x.quantidade, 0);
    return { nome: p.descricao, valor };
  }).sort((a,b) => b.valor - a.valor).slice(0, 5);

  return {
    metrics: {
      totalEmprestadoCentavos: totalEmprestado,
      totalDevolvidoCentavos: totalDevolvido,
      saldoAbertoCentavos: emAberto.reduce((s, x) => s + (x.quantidade - x.quantidadeDevolvida) * x.valorUnitarioCentavos, 0),
      emprestimosAtivos: emAberto.length,
      empresasComPendencia: new Set(emAberto.map(x => x.empresaId)).size,
      materiaisEmAtraso: atrasados.reduce((s, x) => s + (x.quantidade - x.quantidadeDevolvida), 0),
      tempoMedioDevolucaoDias: 0,
      capitalParadoCentavos: atrasados.reduce((s, x) => s + (x.quantidade - x.quantidadeDevolvida) * x.valorUnitarioCentavos, 0),
    },
    serie,
    rankingEmpresas,
    rankingProdutos
  };
}

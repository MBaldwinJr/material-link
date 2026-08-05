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
  RegistroAuditoria
} from "@/types/domain";

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

export async function createEmpresa(input: any): Promise<Empresa> {
  const { data, error } = await supabase
    .from("empresas")
    .insert({
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
    })
    .select()
    .single();
  if (error) throw error;
  
  await logAuditoria("Cadastro de empresa", data.nome_fantasia, `CNPJ ${data.cnpj}`);
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

  await logAuditoria("Cadastro de produto", data.codigo, data.descricao);
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

export async function createEmprestimo(input: any): Promise<Emprestimo> {
  // Generate a number or let DB handle it? For now, simple count + sequence
  const { count } = await supabase.from("emprestimos").select("*", { count: 'exact', head: true });
  const numero = `EMP-${String((count || 0) + 201).padStart(5, "0")}`;

  const { data: loan, error } = await supabase
    .from("emprestimos")
    .insert({
      numero,
      empresa_id: input.empresaId,
      produto_id: input.produtoId,
      quantidade: input.quantidade,
      quantidade_devolvida: 0,
      valor_unitario_centavos: input.valorUnitarioCentavos,
      data: input.data,
      prazo_devolucao: input.prazoDevolucao,
      responsavel: input.responsavel,
      motorista: input.motorista,
      veiculo: input.veiculo,
      observacoes: input.observacoes,
      status: "aberto"
    })
    .select()
    .single();
  if (error) throw error;

  // Update Stock
  const { data: product } = await supabase.from("produtos").select("estoque_atual").eq("id", input.produtoId).single();
  if (product) {
    await supabase.from("produtos")
      .update({ estoque_atual: Math.max(0, Number(product.estoque_atual) - input.quantidade) })
      .eq("id", input.produtoId);
  }

  // Stock Movement
  await supabase.from("movimentacoes_estoque").insert({
    produto_id: input.produtoId,
    empresa_id: input.empresaId,
    tipo: "saida",
    quantidade: input.quantidade,
    usuario: input.responsavel,
    data: input.data,
    origem: numero
  });

  await logAuditoria("Criação de empréstimo", numero, `${input.quantidade} un. movimentadas.`);
  return mapEmprestimo(loan);
}

async function logAuditoria(acao: string, entidade: string, detalhes: string) {
  await supabase.from("auditoria").insert({
    usuario: "usuario.atual",
    acao,
    entidade,
    detalhes: JSON.stringify(detalhes)
  });
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

  return {
    metrics: {
      totalEmprestadoCentavos: totalEmprestado,
      totalDevolvidoCentavos: totalDevolvido,
      saldoAbertoCentavos: emAberto.reduce((s, x) => s + (x.quantidade - x.quantidadeDevolvida) * x.valorUnitarioCentavos, 0),
      emprestimosAtivos: emAberto.length,
      empresasComPendencia: new Set(emAberto.map(x => x.empresaId)).size,
      materiaisEmAtraso: atrasados.reduce((s, x) => s + (x.quantidade - x.quantidadeDevolvida), 0),
      tempoMedioDevolucaoDias: 0, // Simplified for now
      capitalParadoCentavos: atrasados.reduce((s, x) => s + (x.quantidade - x.quantidadeDevolvida) * x.valorUnitarioCentavos, 0),
    },
    serie: [], // Would need grouping logic
    rankingEmpresas: [],
    rankingProdutos: []
  };
}

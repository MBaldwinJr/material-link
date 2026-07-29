export type EmpresaStatus = "ativa" | "suspensa" | "bloqueada";

export interface Empresa {
  readonly id: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly cnpj: string;
  readonly inscricaoEstadual: string;
  readonly telefone: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly responsavel: string;
  readonly cidade: string;
  readonly estado: string;
  readonly status: EmpresaStatus;
  /** Limite financeiro em centavos */
  readonly limiteCentavos: number;
  readonly prazoPadraoDias: number;
  readonly observacoes: string;
  readonly criadoEm: string;
}

export interface Produto {
  readonly id: string;
  readonly codigo: string;
  readonly codigoBarras: string;
  readonly descricao: string;
  readonly marca: string;
  readonly categoria: string;
  readonly fornecedor: string;
  readonly unidade: string;
  /** Valores em centavos */
  readonly custoCentavos: number;
  readonly vendaCentavos: number;
  readonly estoqueAtual: number;
  readonly estoqueMinimo: number;
  readonly localizacao: string;
}

export type EmprestimoStatus = "aberto" | "parcial" | "devolvido" | "atrasado";

export interface Emprestimo {
  readonly id: string;
  readonly numero: string;
  readonly empresaId: string;
  readonly produtoId: string;
  readonly quantidade: number;
  readonly quantidadeDevolvida: number;
  readonly valorUnitarioCentavos: number;
  readonly data: string;
  readonly prazoDevolucao: string;
  readonly responsavel: string;
  readonly motorista: string;
  readonly veiculo: string;
  readonly observacoes: string;
  readonly status: EmprestimoStatus;
}

export type DevolucaoTipo = "total" | "parcial" | "troca" | "avaria" | "perda";

export interface Devolucao {
  readonly id: string;
  readonly emprestimoId: string;
  readonly tipo: DevolucaoTipo;
  readonly quantidade: number;
  readonly data: string;
  readonly responsavel: string;
  readonly observacoes: string;
}

export type MovimentacaoTipo = "saida" | "entrada";

export interface MovimentacaoEstoque {
  readonly id: string;
  readonly produtoId: string;
  readonly empresaId: string;
  readonly tipo: MovimentacaoTipo;
  readonly quantidade: number;
  readonly usuario: string;
  readonly data: string;
  readonly origem: string;
}

export interface Motorista {
  readonly id: string;
  readonly nome: string;
  readonly cnh: string;
  readonly telefone: string;
}

export interface Veiculo {
  readonly id: string;
  readonly placa: string;
  readonly modelo: string;
  readonly capacidade: string;
}

export interface RegistroAuditoria {
  readonly id: string;
  readonly usuario: string;
  readonly acao: string;
  readonly entidade: string;
  readonly data: string;
  readonly detalhes: string;
}

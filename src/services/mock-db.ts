import type {
  Devolucao,
  Empresa,
  Emprestimo,
  MovimentacaoEstoque,
  Motorista,
  Produto,
  RegistroAuditoria,
  Veiculo,
} from "@/types/domain";

const STORAGE_KEY = "intermat.db.v1";

export interface Database {
  empresas: Empresa[];
  produtos: Produto[];
  emprestimos: Emprestimo[];
  devolucoes: Devolucao[];
  movimentacoes: MovimentacaoEstoque[];
  motoristas: Motorista[];
  veiculos: Veiculo[];
  auditoria: RegistroAuditoria[];
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function seed(): Database {
  const empresas: Empresa[] = [
    {
      id: "emp-1",
      razaoSocial: "Construtora Alvorada LTDA",
      nomeFantasia: "Alvorada Materiais",
      cnpj: "12.345.678/0001-90",
      inscricaoEstadual: "110.042.490.114",
      telefone: "(11) 3344-1200",
      whatsapp: "(11) 98877-1200",
      email: "compras@alvorada.com.br",
      responsavel: "Marcos Ferreira",
      cidade: "Campinas",
      estado: "SP",
      status: "ativa",
      limiteCentavos: 5_000_000,
      prazoPadraoDias: 30,
      observacoes: "Parceiro desde 2019.",
      criadoEm: daysAgo(600),
    },
    {
      id: "emp-2",
      razaoSocial: "Depósito São Jorge ME",
      nomeFantasia: "São Jorge Construção",
      cnpj: "98.765.432/0001-11",
      inscricaoEstadual: "220.881.334.001",
      telefone: "(19) 3222-8890",
      whatsapp: "(19) 99120-8890",
      email: "contato@saojorge.com.br",
      responsavel: "Rita Andrade",
      cidade: "Sorocaba",
      estado: "SP",
      status: "suspensa",
      limiteCentavos: 1_500_000,
      prazoPadraoDias: 15,
      observacoes: "Histórico de atrasos em devoluções.",
      criadoEm: daysAgo(410),
    },
    {
      id: "emp-3",
      razaoSocial: "Ferragens Ipiranga S/A",
      nomeFantasia: "Ipiranga Ferragens",
      cnpj: "45.223.909/0001-55",
      inscricaoEstadual: "331.556.220.998",
      telefone: "(11) 4002-8922",
      whatsapp: "(11) 97744-8922",
      email: "logistica@ipirangaferragens.com.br",
      responsavel: "Célia Nunes",
      cidade: "São Paulo",
      estado: "SP",
      status: "ativa",
      limiteCentavos: 8_000_000,
      prazoPadraoDias: 45,
      observacoes: "",
      criadoEm: daysAgo(240),
    },
  ];

  const produtos: Produto[] = [
    {
      id: "prod-1",
      codigo: "CIM-050",
      codigoBarras: "7891234000015",
      descricao: "Cimento CP-II 50kg",
      marca: "Votoran",
      categoria: "Cimento e argamassa",
      fornecedor: "Votorantim",
      unidade: "SC",
      custoCentavos: 3_290,
      vendaCentavos: 4_190,
      estoqueAtual: 420,
      estoqueMinimo: 120,
      localizacao: "Galpão A - Rua 1",
    },
    {
      id: "prod-2",
      codigo: "TIN-018",
      codigoBarras: "7891234000022",
      descricao: "Tinta acrílica branca 18L",
      marca: "Suvinil",
      categoria: "Tintas",
      fornecedor: "BASF",
      unidade: "LT",
      custoCentavos: 22_900,
      vendaCentavos: 31_500,
      estoqueAtual: 38,
      estoqueMinimo: 40,
      localizacao: "Galpão B - Rua 4",
    },
    {
      id: "prod-3",
      codigo: "VER-810",
      codigoBarras: "7891234000039",
      descricao: "Vergalhão CA-50 10mm 12m",
      marca: "Gerdau",
      categoria: "Ferro e aço",
      fornecedor: "Gerdau",
      unidade: "BR",
      custoCentavos: 4_850,
      vendaCentavos: 6_290,
      estoqueAtual: 760,
      estoqueMinimo: 200,
      localizacao: "Pátio externo",
    },
    {
      id: "prod-4",
      codigo: "AND-001",
      codigoBarras: "7891234000046",
      descricao: "Andaime metálico 1m módulo",
      marca: "Rohr",
      categoria: "Equipamentos",
      fornecedor: "Rohr Locações",
      unidade: "UN",
      custoCentavos: 18_000,
      vendaCentavos: 24_900,
      estoqueAtual: 54,
      estoqueMinimo: 20,
      localizacao: "Galpão C",
    },
  ];

  const emprestimos: Emprestimo[] = [
    {
      id: "loan-1",
      numero: "EMP-00124",
      empresaId: "emp-1",
      produtoId: "prod-1",
      quantidade: 120,
      quantidadeDevolvida: 120,
      valorUnitarioCentavos: 4_190,
      data: daysAgo(75),
      prazoDevolucao: daysAgo(45),
      responsavel: "Ana Souza",
      motorista: "Jorge Lima",
      veiculo: "Truck FMH-2214",
      observacoes: "Obra Jardim Aurora.",
      status: "devolvido",
    },
    {
      id: "loan-2",
      numero: "EMP-00131",
      empresaId: "emp-2",
      produtoId: "prod-2",
      quantidade: 24,
      quantidadeDevolvida: 6,
      valorUnitarioCentavos: 31_500,
      data: daysAgo(68),
      prazoDevolucao: daysAgo(38),
      responsavel: "Ana Souza",
      motorista: "Paulo Reis",
      veiculo: "VUC KLM-8890",
      observacoes: "Pintura de fachada.",
      status: "atrasado",
    },
    {
      id: "loan-3",
      numero: "EMP-00140",
      empresaId: "emp-3",
      produtoId: "prod-3",
      quantidade: 300,
      quantidadeDevolvida: 0,
      valorUnitarioCentavos: 6_290,
      data: daysAgo(20),
      prazoDevolucao: inDays(25),
      responsavel: "Diego Matos",
      motorista: "Jorge Lima",
      veiculo: "Truck FMH-2214",
      observacoes: "",
      status: "aberto",
    },
    {
      id: "loan-4",
      numero: "EMP-00142",
      empresaId: "emp-1",
      produtoId: "prod-4",
      quantidade: 30,
      quantidadeDevolvida: 10,
      valorUnitarioCentavos: 24_900,
      data: daysAgo(12),
      prazoDevolucao: inDays(18),
      responsavel: "Diego Matos",
      motorista: "Paulo Reis",
      veiculo: "VUC KLM-8890",
      observacoes: "Andaimes para reforma.",
      status: "parcial",
    },
  ];

  const devolucoes: Devolucao[] = [
    {
      id: "dev-1",
      emprestimoId: "loan-1",
      tipo: "total",
      quantidade: 120,
      data: daysAgo(50),
      responsavel: "Ana Souza",
      observacoes: "Devolução integral conferida.",
    },
    {
      id: "dev-2",
      emprestimoId: "loan-2",
      tipo: "parcial",
      quantidade: 6,
      data: daysAgo(30),
      responsavel: "Ana Souza",
      observacoes: "Restante em uso na obra.",
    },
    {
      id: "dev-3",
      emprestimoId: "loan-4",
      tipo: "parcial",
      quantidade: 10,
      data: daysAgo(3),
      responsavel: "Diego Matos",
      observacoes: "",
    },
  ];

  const movimentacoes: MovimentacaoEstoque[] = emprestimos.map((loan, index) => ({
    id: `mov-${index + 1}`,
    produtoId: loan.produtoId,
    empresaId: loan.empresaId,
    tipo: "saida" as const,
    quantidade: loan.quantidade,
    usuario: loan.responsavel,
    data: loan.data,
    origem: loan.numero,
  }));

  return {
    empresas,
    produtos,
    emprestimos,
    devolucoes,
    movimentacoes,
    motoristas: [
      { id: "mot-1", nome: "Jorge Lima", cnh: "0123456789", telefone: "(11) 98111-2233" },
      { id: "mot-2", nome: "Paulo Reis", cnh: "9876543210", telefone: "(19) 99444-5566" },
    ],
    veiculos: [
      { id: "vei-1", placa: "FMH-2214", modelo: "Truck Mercedes Atego", capacidade: "12t" },
      { id: "vei-2", placa: "KLM-8890", modelo: "VUC Iveco Daily", capacidade: "3,5t" },
    ],
    auditoria: [
      {
        id: "aud-1",
        usuario: "ana.souza",
        acao: "Criação de empréstimo",
        entidade: "EMP-00140",
        data: daysAgo(20),
        detalhes: "300 BR de vergalhão CA-50 para Ipiranga Ferragens.",
      },
      {
        id: "aud-2",
        usuario: "diego.matos",
        acao: "Devolução parcial",
        entidade: "EMP-00142",
        data: daysAgo(3),
        detalhes: "10 módulos de andaime retornaram ao estoque.",
      },
    ],
  };
}

let cache: Database | null = null;

export function getDatabase(): Database {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        cache = JSON.parse(raw) as Database;
        return cache;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
  cache = seed();
  persist();
  return cache;
}

export function persist(): void {
  if (typeof window === "undefined" || !cache) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function mutate(updater: (db: Database) => void): void {
  const db = getDatabase();
  updater(db);
  persist();
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

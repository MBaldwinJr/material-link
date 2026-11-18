import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Model B database projection. This is a type-only view of the same client,
// which shares its current Supabase Auth session.
type NetworkTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface OrganizationRow {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  status: "pendente" | "ativa" | "suspensa" | "bloqueada";
  criado_em: string;
}
export interface MembershipRow {
  organizacao_id: string;
  usuario_id: string;
  papel: "proprietario" | "administrador" | "comercial" | "estoque" | "financeiro" | "consulta";
  ativo: boolean;
  criado_em: string;
}
export interface PartnershipRow {
  id: string;
  solicitante_id: string;
  convidada_id: string;
  status: "pendente" | "ativa" | "recusada" | "bloqueada";
  solicitado_por: string;
  respondido_por: string | null;
  criado_em: string;
  atualizado_em: string;
}
export interface ProductRow {
  id: string;
  organizacao_id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  custo_privado_centavos: number;
  preco_venda_privado_centavos: number;
  estoque: number;
  reservado: number;
  criado_em: string;
}
export interface OfferRow {
  id: string;
  organizacao_id: string;
  produto_id: string;
  descricao_publica: string;
  unidade: string;
  preco_acordavel_centavos: number;
  ativa: boolean;
  criado_em: string;
}
export interface LoanRow {
  id: string;
  cedente_id: string;
  tomadora_id: string;
  oferta_id: string;
  produto_id: string;
  quantidade: number;
  quantidade_devolvida: number;
  valor_unitario_centavos: number;
  descricao_snapshot: string;
  unidade_snapshot: string;
  prazo_devolucao: string;
  status: "solicitado" | "aceito" | "expedido" | "recebido" | "devolucao_em_transito" | "concluido" | "recusado" | "cancelado";
  versao: number;
  chave_idempotencia: string;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}
export interface ReturnRow {
  id: string;
  emprestimo_id: string;
  quantidade: number;
  status: "em_transito" | "confirmada" | "divergente";
  chave_idempotencia: string;
  solicitado_por: string;
  confirmado_por: string | null;
  criado_em: string;
  confirmado_em: string | null;
}
export interface EventRow {
  id: string;
  emprestimo_id: string;
  organizacao_ator_id: string;
  usuario_ator_id: string;
  evento: string;
  versao: number;
  detalhes_publicos: Json;
  criado_em: string;
}

interface NetworkDatabase {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
      rede_organizacoes: NetworkTable<OrganizationRow>;
      rede_membros: NetworkTable<MembershipRow>;
      rede_parcerias: NetworkTable<PartnershipRow>;
      rede_produtos: NetworkTable<ProductRow>;
      rede_ofertas: NetworkTable<OfferRow>;
      rede_emprestimos: NetworkTable<LoanRow>;
      rede_devolucoes: NetworkTable<ReturnRow>;
      rede_eventos: NetworkTable<EventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      rede_criar_organizacao: {
        Args: { p_razao: string; p_nome: string; p_cnpj: string };
        Returns: Json;
      };
      rede_operar: {
        Args: { p_organizacao_id: string; p_acao: string; p_dados: Json };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export const networkDb = supabase as unknown as SupabaseClient<NetworkDatabase>;

export async function networkCommand<T>(
  organizationId: string,
  action: string,
  args: Record<string, string | number | boolean | null>,
): Promise<T> {
  const { data, error } = await networkDb.rpc("rede_operar", {
    p_organizacao_id: organizationId,
    p_acao: action,
    p_dados: args as Json,
  });
  if (error) throw error;
  if (data === null) throw new Error("A operação não foi confirmada.");
  return data as T;
}

export async function createNetworkOrganization(
  legalName: string,
  displayName: string,
  cnpj: string,
): Promise<OrganizationRow> {
  const { data, error } = await networkDb.rpc("rede_criar_organizacao", {
    p_razao: legalName,
    p_nome: displayName,
    p_cnpj: cnpj,
  });
  if (error) throw error;
  if (data === null) throw new Error("A organização não foi criada.");
  return data as unknown as OrganizationRow;
}

export interface NetworkSnapshot {
  organizations: OrganizationRow[];
  memberships: MembershipRow[];
  partnerships: PartnershipRow[];
  products: ProductRow[];
  offers: OfferRow[];
  loans: LoanRow[];
  returns: ReturnRow[];
  events: EventRow[];
}

export async function loadNetworkSnapshot(): Promise<NetworkSnapshot> {
  const [organizations, memberships, partnerships, products, offers, loans, returns, events] =
    await Promise.all([
      networkDb.from("rede_organizacoes").select("*").order("nome_fantasia").limit(200),
      networkDb.from("rede_membros").select("*").limit(200),
      networkDb.from("rede_parcerias").select("*").order("criado_em", { ascending: false }).limit(300),
      networkDb.from("rede_produtos").select("*").order("descricao").limit(500),
      networkDb.from("rede_ofertas").select("*").order("criado_em", { ascending: false }).limit(500),
      networkDb.from("rede_emprestimos").select("*").order("criado_em", { ascending: false }).limit(500),
      networkDb.from("rede_devolucoes").select("*").order("criado_em", { ascending: false }).limit(500),
      networkDb.from("rede_eventos").select("*").order("criado_em", { ascending: false }).limit(500),
    ]);
  for (const result of [organizations, memberships, partnerships, products, offers, loans, returns, events]) {
    if (result.error) throw result.error;
  }
  return {
    organizations: organizations.data ?? [],
    memberships: memberships.data ?? [],
    partnerships: partnerships.data ?? [],
    products: products.data ?? [],
    offers: offers.data ?? [],
    loans: loans.data ?? [],
    returns: returns.data ?? [],
    events: events.data ?? [],
  };
}

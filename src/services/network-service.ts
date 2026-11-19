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
      rede_convidar_membro: {
        Args: { p_organizacao_id: string; p_email: string; p_papel: string };
        Returns: Json;
      };
      rede_aceitar_convite: {
        Args: { p_token: string };
        Returns: Json;
      };
      rede_ajustar_estoque: {
        Args: { p_organizacao_id: string; p_produto_id: string; p_diferenca: number; p_motivo: string };
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
  const { data, error } = await networkDb.rpc("rede_operar" as never, {
    p_organizacao_id: organizationId,
    p_acao: action,
    p_dados: args as Json,
  } as never);
  if (error) throw error;
  if (data === null) throw new Error("A operação não foi confirmada.");
  return data as T;
}

export async function createNetworkOrganization(
  legalName: string,
  displayName: string,
  cnpj: string,
): Promise<OrganizationRow> {
  const { data, error } = await networkDb.rpc("rede_criar_organizacao" as never, {
    p_razao: legalName,
    p_nome: displayName,
    p_cnpj: cnpj,
  } as never);
  if (error) throw error;
  if (data === null) throw new Error("A organização não foi criada.");
  return data as unknown as OrganizationRow;
}

export async function adjustOrganizationStock(
  organizationId: string, productId: string, delta: number, reason: string,
): Promise<{ produto_id: string; estoque_anterior: number; estoque_atual: number }> {
  const { data, error } = await networkDb.rpc("rede_ajustar_estoque" as never, {
    p_organizacao_id: organizationId, p_produto_id: productId,
    p_diferenca: delta, p_motivo: reason,
  } as never);
  if (error) throw error;
  if (data === null) throw new Error("Ajuste de estoque não confirmado.");
  return data as unknown as { produto_id: string; estoque_anterior: number; estoque_atual: number };
}

export interface MemberInvitation {
  token: string;
  email: string;
  papel: string;
  expira_em: string;
}

export async function inviteOrganizationMember(
  organizationId: string, email: string, role: string,
): Promise<MemberInvitation> {
  const { data, error } = await networkDb.rpc("rede_convidar_membro" as never, {
    p_organizacao_id: organizationId, p_email: email, p_papel: role,
  } as never);
  if (error) throw error;
  if (data === null) throw new Error("Convite não gerado.");
  return data as unknown as MemberInvitation;
}

export async function acceptOrganizationInvitation(
  token: string,
): Promise<{ organizacao_id: string; papel: string; status: string }> {
  const { data, error } = await networkDb.rpc("rede_aceitar_convite" as never,
    { p_token: token } as never);
  if (error) throw error;
  if (data === null) throw new Error("Não foi possível aceitar este convite.");
  return data as unknown as { organizacao_id: string; papel: string; status: string };
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

/** PostgREST may cap each request (often at 1,000 rows).
 * Use stable primary-key ordering and smaller pages instead of silently
 * dropping catalog or loan records from the network dashboard.
 */
const NETWORK_PAGE_SIZE = 400;
type PageResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

async function loadEveryPage<Row>(
  fetchPage: (from: number, to: number) => Promise<PageResult<Row>>,
): Promise<Row[]> {
  const all: Row[] = [];
  for (let offset = 0; ; offset += NETWORK_PAGE_SIZE) {
    const { data, error } = await fetchPage(
      offset, offset + NETWORK_PAGE_SIZE - 1,
    );
    if (error) throw new Error(error.message);
    if (data === null) throw new Error("Consulta da rede sem resultado válido.");
    all.push(...data);
    if (data.length < NETWORK_PAGE_SIZE) return all;
  }
}

export async function loadNetworkSnapshot(): Promise<NetworkSnapshot> {
  const [
    organizations, memberships, partnerships, products, offers, loans,
    returns, events,
  ] = await Promise.all([
    loadEveryPage<OrganizationRow>(async (from, to) =>
      networkDb.from("rede_organizacoes").select("*")
        .order("id", { ascending: true }).range(from, to)),
    loadEveryPage<MembershipRow>(async (from, to) =>
      networkDb.from("rede_membros").select("*")
        .order("organizacao_id", { ascending: true })
        .order("usuario_id", { ascending: true }).range(from, to)),
    loadEveryPage<PartnershipRow>(async (from, to) =>
      networkDb.from("rede_parcerias").select("*")
        .order("id", { ascending: true }).range(from, to)),
    loadEveryPage<ProductRow>(async (from, to) =>
      networkDb.from("rede_produtos").select("*")
        .order("id", { ascending: true }).range(from, to)),
    loadEveryPage<OfferRow>(async (from, to) =>
      networkDb.from("rede_ofertas").select("*")
        .order("id", { ascending: true }).range(from, to)),
    loadEveryPage<LoanRow>(async (from, to) =>
      networkDb.from("rede_emprestimos").select("*")
        .order("id", { ascending: true }).range(from, to)),
    loadEveryPage<ReturnRow>(async (from, to) =>
      networkDb.from("rede_devolucoes").select("*")
        .order("id", { ascending: true }).range(from, to)),
    loadEveryPage<EventRow>(async (from, to) =>
      networkDb.from("rede_eventos").select("*")
        .order("id", { ascending: true }).range(from, to)),
  ]);
  return {
    organizations, memberships, partnerships, products,
    offers, loans, returns, events,
  };
}

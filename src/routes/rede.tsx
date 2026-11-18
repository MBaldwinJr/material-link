import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  networkCommand,
  loadNetworkSnapshot,
  createNetworkOrganization,
  type NetworkSnapshot,
  type LoanRow,
  type OrganizationRow,
  type OfferRow,
} from "@/services/network-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/rede")({
  head: () => ({ meta: [{ title: "Rede colaborativa | Material Link" }] }),
  component: MaterialLinkNetwork,
});

type Tab = "painel" | "parcerias" | "produtos" | "ofertas" | "emprestimos" | "historico";

const TABS: readonly { id: Tab; label: string }[] = [
  { id: "painel", label: "Painel" },
  { id: "parcerias", label: "Parcerias" },
  { id: "produtos", label: "Meu estoque" },
  { id: "ofertas", label: "Vitrine" },
  { id: "emprestimos", label: "Empréstimos" },
  { id: "historico", label: "Histórico" },
];

function money(cents: number | string | null): string {
  return (Number(cents ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL",
  });
}
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}
function formatQuantity(value: number | string): string {
  return Number(value).toLocaleString("pt-BR");
}
function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}
function nameOf(organizations: readonly OrganizationRow[], id: string): string {
  return organizations.find((org) => org.id === id)?.nome_fantasia ?? "Empresa";
}

function MaterialLinkNetwork() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);
  const [activeOrgId, setActiveOrgId] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("painel");

  const refresh = useCallback(async () => {
    const next = await loadNetworkSnapshot();
    setSnapshot(next);
    setActiveOrgId((current) => {
      const eligible = next.memberships.filter((member) => member.ativo);
      return eligible.some((member) => member.organizacao_id === current)
        ? current : eligible[0]?.organizacao_id ?? "";
    });
  }, []);

  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) { setUser(data.user); setAuthReady(true); }
    }).catch(() => { if (live) setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!live) return;
      setUser(session?.user ?? null);
      setSnapshot(null);
      setActiveOrgId("");
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    void loadNetworkSnapshot().then((next) => {
      if (!live) return;
      setSnapshot(next);
      setActiveOrgId((current) =>
        next.memberships.some((item) => item.ativo && item.organizacao_id === current)
          ? current : next.memberships.find((item) => item.ativo)?.organizacao_id ?? "",
      );
    }).catch((error: unknown) => {
      if (live) toast.error(messageFromError(error));
    });
    return () => { live = false; };
  }, [user?.id, user]);

  async function perform(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(messageFromError(error));
    } finally {
      setBusy(false);
    }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Cadastro solicitado. Confirme seu e-mail para entrar.");
        setAuthMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Autenticação realizada.");
      }
      setPassword("");
    } catch (error) {
      toast.error(messageFromError(error));
    } finally { setBusy(false); }
  }

  const organization = snapshot?.organizations.find((o) => o.id === activeOrgId);
  const membership = snapshot?.memberships.find((m) =>
    m.organizacao_id === activeOrgId && m.usuario_id === user?.id && m.ativo,
  );
  const role = membership?.papel;
  const canManage = role === "proprietario" || role === "administrador";
  const canCommercial = canManage || role === "comercial";
  const canStock = canManage || role === "estoque";
  const organizations = snapshot?.organizations ?? [];
  const products = (snapshot?.products ?? []).filter((p) => p.organizacao_id === activeOrgId);
  const offers = snapshot?.offers ?? [];
  const loans = (snapshot?.loans ?? []).filter((loan) =>
    loan.cedente_id === activeOrgId || loan.tomadora_id === activeOrgId,
  );
  const partnerships = (snapshot?.partnerships ?? []).filter((p) =>
    p.solicitante_id === activeOrgId || p.convidada_id === activeOrgId,
  );

  const activePartners = useMemo(() => new Set(partnerships
    .filter((p) => p.status === "ativa")
    .map((p) => p.solicitante_id === activeOrgId ? p.convidada_id : p.solicitante_id)),
  [partnerships, activeOrgId]);

  const pendingLoans = loans.filter((loan) =>
    loan.status !== "concluido" && loan.status !== "recusado" && loan.status !== "cancelado",
  );

  if (!authReady) {
    return <div role="status" className="grid min-h-screen place-items-center">Verificando sessão...</div>;
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Material Link</CardTitle>
            <p className="text-muted-foreground text-sm">Rede colaborativa de empréstimos entre empresas.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => { void authenticate(event); }} className="space-y-4">
              <label htmlFor="network-email" className="block text-sm font-medium">E-mail</label>
              <Input id="network-email" type="email" required autoComplete="username"
                value={email} onChange={(event) => setEmail(event.target.value)} />
              <label htmlFor="network-password" className="block text-sm font-medium">Senha</label>
              <Input id="network-password" type="password" required autoComplete={authMode === "login" ? "current-password" : "new-password"}
                minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? "Processando..." : authMode === "login" ? "Entrar" : "Solicitar cadastro"}
              </Button>
              <button type="button" className="w-full text-sm underline"
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
                {authMode === "login" ? "Criar conta" : "Já possuo uma conta"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!snapshot) {
    return <div role="status" className="grid min-h-screen place-items-center">Carregando sua rede...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Material Link</h1>
            <p className="text-muted-foreground text-xs">Rede de empresas • Empréstimos com aceite bilateral</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {snapshot.memberships.some((m) => m.ativo) && (
              <select aria-label="Empresa ativa" className="rounded-md border bg-background px-3 py-2 text-sm"
                value={activeOrgId} onChange={(e) => {
                  setActiveOrgId(e.target.value);
                  setTab("painel");
                  // Organization context is UI-only: every SQL RPC rechecks membership.
                }}>
                {snapshot.memberships.filter((m) => m.ativo).map((m) => (
                  <option key={m.organizacao_id} value={m.organizacao_id}>
                    {nameOf(organizations, m.organizacao_id)}
                  </option>
                ))}
              </select>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              void supabase.auth.signOut().then(() => {
                setSnapshot(null);
                setActiveOrgId("");
              });
            }}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        {!organization ? (
          <CreateOrganization busy={busy} perform={perform} />
        ) : organization.status !== "ativa" ? (
          <Card>
            <CardHeader><CardTitle>Verificação empresarial pendente</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p>A conta de <strong>{organization.nome_fantasia}</strong> foi criada com sucesso.</p>
              <p className="text-muted-foreground text-sm">
                A organização precisa ser validada antes de firmar parcerias ou movimentar mercadorias.
                O primeiro administrador da rede deve autorizar a ativação.
              </p>
              <Badge variant="outline">{organization.status}</Badge>
              <Button variant="outline" onClick={() => void perform(async () => {}, "Dados atualizados")}>
                Atualizar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2" aria-label="Módulos da rede">
              {TABS.map((item) => (
                <Button key={item.id} size="sm"
                  variant={tab === item.id ? "default" : "outline"}
                  onClick={() => setTab(item.id)}>{item.label}</Button>
              ))}
            </nav>
            {tab === "painel" && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">{organization.nome_fantasia}</h2>
                <p className="text-muted-foreground text-sm">
                  Perfil: {membership?.papel}. Os materiais de outras empresas só aparecem quando publicados e compartilhados.
                </p>
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ["Parcerias ativas", activePartners.size],
                    ["Produtos próprios", products.length],
                    ["Emprestei", pendingLoans.filter((l) => l.cedente_id === activeOrgId).length],
                    ["Tomei emprestado", pendingLoans.filter((l) => l.tomadora_id === activeOrgId).length],
                  ].map(([label, value]) => (
                    <Card key={label}><CardContent className="space-y-1 p-5">
                      <p className="text-muted-foreground text-sm">{label}</p>
                      <p className="text-3xl font-semibold tabular-nums">{value}</p>
                    </CardContent></Card>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm">A plataforma separa estoque próprio, material expedido e custódia de mercadorias pertencentes a parceiros.</p>
              </div>
            )}

            {tab === "parcerias" && (
              <Partnerships organizationId={activeOrgId}
                organizations={organizations} partnerships={partnerships}
                canCommercial={canCommercial} perform={perform} busy={busy} />
            )}

            {tab === "produtos" && (
              <Products organizationId={activeOrgId} products={products}
                canStock={canStock} canCommercial={canCommercial}
                perform={perform} busy={busy} />
            )}

            {tab === "ofertas" && (
              <Offers organizationId={activeOrgId} offers={offers}
                organizations={organizations} partners={activePartners}
                canCommercial={canCommercial} perform={perform} busy={busy} />
            )}

            {tab === "emprestimos" && (
              <Loans organizationId={activeOrgId} loans={loans}
                returns={snapshot.returns} organizations={organizations}
                canCommercial={canCommercial} canStock={canStock}
                perform={perform} busy={busy} />
            )}

            {tab === "historico" && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Eventos compartilhados</h2>
                {snapshot.events.filter((event) => loans.some((loan) => loan.id === event.emprestimo_id))
                  .map((event) => (
                    <Card key={event.id}><CardContent className="flex flex-wrap justify-between gap-2 p-4 text-sm">
                      <span className="font-medium">{event.evento.replaceAll("_", " ")}</span>
                      <span>{nameOf(organizations, event.organizacao_ator_id)}</span>
                      <span className="text-muted-foreground">{new Date(event.criado_em).toLocaleString("pt-BR")}</span>
                    </CardContent></Card>
                  ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type Perform = (action: () => Promise<unknown>, success: string) => Promise<void>;

function CreateOrganization({ busy, perform }: { busy: boolean; perform: Perform }) {
  const [legal, setLegal] = useState("");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  return <Card className="max-w-xl">
    <CardHeader><CardTitle>Cadastrar minha empresa</CardTitle></CardHeader>
    <CardContent>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        void perform(() => createNetworkOrganization(legal, name, cnpj.replace(/\D/g, "")),
          "Empresa cadastrada. Aguarde a validação.");
      }}>
        <label className="block text-sm font-medium" htmlFor="legal">Razão social</label>
        <Input id="legal" required value={legal} onChange={(e) => setLegal(e.target.value)} />
        <label className="block text-sm font-medium" htmlFor="display">Nome fantasia</label>
        <Input id="display" required value={name} onChange={(e) => setName(e.target.value)} />
        <label className="block text-sm font-medium" htmlFor="cnpj">CNPJ (somente números)</label>
        <Input id="cnpj" required inputMode="numeric" minLength={14} maxLength={18}
          value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        <Button type="submit" disabled={busy}>Cadastrar organização</Button>
      </form>
    </CardContent>
  </Card>;
}

function Partnerships({ organizationId, organizations, partnerships, canCommercial, perform, busy }: {
  organizationId: string; organizations: OrganizationRow[];
  partnerships: NetworkSnapshot["partnerships"];
  canCommercial: boolean; perform: Perform; busy: boolean;
}) {
  const [target, setTarget] = useState("");
  const available = organizations.filter((org) =>
    org.status === "ativa" && org.id !== organizationId
    && !partnerships.some((p) => [p.solicitante_id, p.convidada_id].includes(org.id)),
  );
  return <div className="space-y-4">
    <h2 className="text-xl font-semibold">Parcerias empresariais</h2>
    {canCommercial && <Card><CardHeader><CardTitle className="text-base">Convidar empresa parceira</CardTitle></CardHeader>
      <CardContent><form className="flex flex-wrap gap-2" onSubmit={(e) => {
        e.preventDefault();
        void perform(() => networkCommand(organizationId, "solicitar_parceria",
          { outra_organizacao_id: target }), "Convite de parceria enviado.");
      }}>
        <select aria-label="Selecionar organização" required value={target}
          onChange={(e) => setTarget(e.target.value)} className="min-w-56 rounded-md border bg-background px-3 py-2">
          <option value="">Escolha uma empresa</option>
          {available.map((org) => <option value={org.id} key={org.id}>{org.nome_fantasia}</option>)}
        </select>
        <Button disabled={busy || !target}>Enviar convite</Button>
      </form></CardContent>
    </Card>}
    {partnerships.map((partnership) => {
      const incoming = partnership.convidada_id === organizationId;
      const otherId = incoming ? partnership.solicitante_id : partnership.convidada_id;
      return <Card key={partnership.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="font-medium">{nameOf(organizations, otherId)}</p>
          <p className="text-muted-foreground text-xs">{incoming ? "Convite recebido" : "Convite enviado"}</p></div>
        <Badge variant="outline">{partnership.status}</Badge>
        {incoming && partnership.status === "pendente" && canCommercial && (
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void perform(
              () => networkCommand(organizationId, "responder_parceria",
                { parceria_id: partnership.id, aceitar: true }), "Parceria ativada.")}>
              Aceitar
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void perform(
              () => networkCommand(organizationId, "responder_parceria",
                { parceria_id: partnership.id, aceitar: false }), "Parceria recusada.")}>
              Recusar
            </Button>
          </div>
        )}
      </CardContent></Card>;
    })}
    {partnerships.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma parceria registrada.</p>}
  </div>;
}

function Products({ organizationId, products, canStock, canCommercial, perform, busy }: {
  organizationId: string; products: NetworkSnapshot["products"];
  canStock: boolean; canCommercial: boolean; perform: Perform; busy: boolean;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [publishId, setPublishId] = useState("");
  const [price, setPrice] = useState("0");
  return <div className="space-y-4">
    <h2 className="text-xl font-semibold">Estoque privado da empresa</h2>
    <p className="text-muted-foreground text-sm">Preços internos e saldo físico não são compartilhados com parceiros.</p>
    <div className="grid gap-3 lg:grid-cols-2">
      {canStock && <Card><CardHeader><CardTitle className="text-base">Cadastrar produto</CardTitle></CardHeader>
        <CardContent><form className="space-y-2" onSubmit={(e) => {
          e.preventDefault();
          void perform(() => networkCommand(organizationId, "criar_produto", {
            codigo: code, descricao: description, unidade: "UN",
            estoque: Number(quantity), custo_privado_centavos: 0,
            preco_venda_privado_centavos: 0,
          }), "Produto incluído no estoque privado.");
        }}>
          <Input aria-label="Código do produto" required placeholder="Código interno"
            value={code} onChange={(e) => setCode(e.target.value)} />
          <Input aria-label="Descrição do produto" required placeholder="Descrição"
            value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input aria-label="Saldo inicial" type="number" min="0" step="0.001" required
            placeholder="Saldo inicial" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Button disabled={busy}>Salvar produto</Button>
        </form></CardContent>
      </Card>}
      {canCommercial && <Card><CardHeader><CardTitle className="text-base">Publicar oferta para parceiros</CardTitle></CardHeader>
        <CardContent><form className="space-y-2" onSubmit={(e) => {
          e.preventDefault();
          void perform(() => networkCommand(organizationId, "publicar_oferta", {
            produto_id: publishId,
            preco_centavos: Math.round(Number(price) * 100),
          }), "Oferta publicada para parceiros ativos.");
        }}>
          <select aria-label="Produto para publicar" required value={publishId}
            onChange={(e) => setPublishId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2">
            <option value="">Escolha um produto seu</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
          </select>
          <Input aria-label="Valor da oferta em reais" type="number" min="0" step="0.01" required
            value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button disabled={busy || !publishId}>Publicar</Button>
        </form></CardContent>
      </Card>}
    </div>
    <Card><CardContent className="p-4">
      <div className="space-y-2">
        {products.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm last:border-0">
          <span><strong>{p.codigo}</strong> — {p.descricao}</span>
          <span>Estoque: {formatQuantity(p.estoque)} {p.unidade} • Reserva: {formatQuantity(p.reservado)}</span>
        </div>)}
        {products.length === 0 && <p className="text-muted-foreground">Nenhum produto próprio cadastrado.</p>}
      </div>
    </CardContent></Card>
  </div>;
}

function Offers({ organizationId, offers, organizations, partners, canCommercial, perform, busy }: {
  organizationId: string; offers: OfferRow[]; organizations: OrganizationRow[];
  partners: Set<string>; canCommercial: boolean; perform: Perform; busy: boolean;
}) {
  const [offerId, setOfferId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [due, setDue] = useState("");
  const visible = offers.filter((offer) => offer.organizacao_id !== organizationId
    && partners.has(offer.organizacao_id));
  return <div className="space-y-4">
    <h2 className="text-xl font-semibold">Vitrine das parceiras</h2>
    <p className="text-muted-foreground text-sm">
      Produtos divulgados voluntariamente por empresas com parceria ativa.
    </p>
    {canCommercial && visible.length > 0 && (
      <Card><CardHeader><CardTitle className="text-base">Solicitar empréstimo</CardTitle></CardHeader>
        <CardContent><form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
          e.preventDefault();
          void perform(() => networkCommand(organizationId, "solicitar_emprestimo", {
            oferta_id: offerId,
            quantidade: Number(quantity),
            prazo_devolucao: new Date(due).toISOString(),
            idempotency_key: crypto.randomUUID(),
          }), "Solicitação enviada à empresa cedente.");
        }}>
          <select aria-label="Material disponível" value={offerId} onChange={(e) => setOfferId(e.target.value)}
            required className="min-w-64 rounded-md border bg-background px-3 py-2">
            <option value="">Escolha um material</option>
            {visible.map((offer) => <option key={offer.id} value={offer.id}>
              {nameOf(organizations, offer.organizacao_id)} — {offer.descricao_publica}
            </option>)}
          </select>
          <label className="text-sm">Quantidade
            <Input className="w-28" type="number" min="0.001" step="0.001" required
              value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="text-sm">Prazo de devolução
            <Input type="date" required value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <Button disabled={busy || !offerId || !due}>Solicitar</Button>
        </form></CardContent>
      </Card>
    )}
    {visible.map((offer) => <Card key={offer.id}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="font-medium">{offer.descricao_publica}</p>
          <p className="text-muted-foreground text-sm">
            {nameOf(organizations, offer.organizacao_id)} • {offer.unidade}
          </p></div>
        <span>{money(offer.preco_acordavel_centavos)} / {offer.unidade}</span>
      </CardContent>
    </Card>)}
    {visible.length === 0 && <p className="text-muted-foreground text-sm">
      Nenhuma oferta disponível. Ative parcerias para visualizar materiais publicados.
    </p>}
  </div>;
}

function Loans({ organizationId, loans, returns, organizations, canCommercial, canStock, perform, busy }: {
  organizationId: string; loans: LoanRow[]; returns: NetworkSnapshot["returns"];
  organizations: OrganizationRow[]; canCommercial: boolean; canStock: boolean;
  perform: Perform; busy: boolean;
}) {
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  function act(loan: LoanRow, action: string, label: string) {
    void perform(() => networkCommand(organizationId, action, {
      emprestimo_id: loan.id, expected_version: loan.versao,
    }), label);
  }
  return <div className="space-y-4">
    <h2 className="text-xl font-semibold">Empréstimos entre empresas</h2>
    {loans.map((loan) => {
      const lender = loan.cedente_id === organizationId;
      const pendingReturns = returns.filter((item) =>
        item.emprestimo_id === loan.id && item.status === "em_transito");
      return <Card key={loan.id}><CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="outline">{lender ? "Sou cedente" : "Sou tomadora"}</Badge>
            <h3 className="mt-2 font-semibold">{loan.descricao_snapshot}</h3>
            <p className="text-muted-foreground text-sm">
              {nameOf(organizations, loan.cedente_id)} → {nameOf(organizations, loan.tomadora_id)}
            </p>
          </div>
          <Badge>{loan.status.replaceAll("_", " ")}</Badge>
        </div>
        <p className="text-sm">
          {formatQuantity(loan.quantidade_devolvida)} / {formatQuantity(loan.quantidade)} {loan.unidade_snapshot}
          {" "}devolvidos • {money(loan.valor_unitario_centavos)} por unidade • Prazo {formatDate(loan.prazo_devolucao)}
        </p>
        <div className="flex flex-wrap gap-2">
          {lender && canCommercial && loan.status === "solicitado" && <>
            <Button size="sm" disabled={busy} onClick={() => act(loan, "aceitar_emprestimo", "Empréstimo aceito e reservado.")}>Aceitar e reservar</Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => act(loan, "recusar_emprestimo", "Solicitação recusada.")}>Recusar</Button>
          </>}
          {!lender && canCommercial && loan.status === "solicitado" &&
            <Button variant="outline" size="sm" disabled={busy} onClick={() => act(loan, "cancelar_emprestimo", "Solicitação cancelada.")}>Cancelar</Button>}
          {lender && canStock && loan.status === "aceito" &&
            <Button size="sm" disabled={busy} onClick={() => act(loan, "expedir_emprestimo", "Material expedido.")}>Confirmar saída</Button>}
          {!lender && canStock && loan.status === "expedido" &&
            <Button size="sm" disabled={busy} onClick={() => act(loan, "confirmar_recebimento", "Recebimento confirmado em custódia.")}>Recebi o material</Button>}
          {!lender && canStock && ["recebido", "devolucao_em_transito"].includes(loan.status) && (
            <form className="flex flex-wrap gap-2" onSubmit={(event) => {
              event.preventDefault();
              void perform(() => networkCommand(organizationId, "enviar_devolucao", {
                emprestimo_id: loan.id, expected_version: loan.versao,
                quantidade: Number(returnQuantities[loan.id] ?? 1),
                idempotency_key: crypto.randomUUID(),
              }), "Devolução enviada. A cedente precisa confirmar o recebimento.");
            }}>
              <Input type="number" aria-label="Quantidade a devolver" className="w-36"
                min="0.001" step="0.001" required
                max={Math.max(0, Number(loan.quantidade)-Number(loan.quantidade_devolvida))}
                value={returnQuantities[loan.id] ?? "1"}
                onChange={(e) => setReturnQuantities((old) => ({ ...old, [loan.id]: e.target.value }))} />
              <Button size="sm" disabled={busy}>Enviar devolução</Button>
            </form>
          )}
          {lender && canStock && pendingReturns.map((item) => (
            <Button size="sm" key={item.id} disabled={busy} onClick={() => void perform(
              () => networkCommand(organizationId, "confirmar_devolucao", {
                devolucao_id: item.id, expected_version: loan.versao,
              }), "Devolução confirmada e estoque atualizado.")}>
              Conferir retorno de {formatQuantity(item.quantidade)}
            </Button>
          ))}
        </div>
      </CardContent></Card>;
    })}
    {loans.length === 0 && <p className="text-muted-foreground text-sm">
      Ainda não existem empréstimos compartilhados com esta empresa.
    </p>}
  </div>;
}

import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  PackageSearch,
  ShieldCheck,
  Truck,
  Undo2,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoleProvider, useAccessRole, type AccessRole } from "@/components/auth/role-access";

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: <BarChart3 className="size-4" /> },
  { to: "/empresas", label: "Empresas", icon: <Building2 className="size-4" /> },
  { to: "/produtos", label: "Produtos", icon: <PackageSearch className="size-4" /> },
  { to: "/emprestimos", label: "Empréstimos", icon: <ClipboardList className="size-4" /> },
  { to: "/devolucoes", label: "Devoluções", icon: <Undo2 className="size-4" /> },
  { to: "/estoque", label: "Estoque", icon: <Boxes className="size-4" /> },
  { to: "/logistica", label: "Logística", icon: <Truck className="size-4" /> },
  { to: "/auditoria", label: "Auditoria", icon: <ShieldCheck className="size-4" /> },
];

interface AppShellProps {
  readonly title: string;
  readonly description: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

function AuthenticatedShell({ title, description, actions, children }: AppShellProps) {
  const role = useAccessRole();
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-border bg-sidebar lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-r">
          <div className="flex items-center gap-2 px-5 py-5">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-bold">
              IM
            </div>
            <div className="leading-tight">
              <p className="text-sidebar-foreground text-sm font-semibold">InterMat</p>
              <p className="text-muted-foreground text-xs">Gestão de Empréstimos</p>
            </div>
          </div>
          <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
            {NAV_ITEMS.filter((item) => item.to !== "/auditoria" || role === "admin" || role === "gestor").map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors"
                activeProps={{
                  className:
                    "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{description}</p>
            </div>
            {actions}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}


type AccessState = AccessRole | "checking" | "denied";

function AuthGate({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<AccessState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSession(data.session);
      setReady(true);
    }).catch(() => {
      if (live) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, updated) => {
      if (!live) return;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") queryClient.clear();
      setSession(updated);
      setAccess("checking");
      setReady(true);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, [queryClient]);

  useEffect(() => {
    let live = true;
    if (!session?.user.id) {
      setAccess("checking");
      return;
    }
    setAccess("checking");
    void supabase
      .from("inter_mat_operadores")
      .select("papel, ativo")
      .eq("usuario_id", session.user.id)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!live) return;
        setAccess(!queryError && data?.ativo ? data.papel : "denied");
      });
    return () => { live = false; };
  }, [session?.access_token, session?.user.id]);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError("Não foi possível solicitar o cadastro. Verifique os dados ou contate o administrador.");
        } else {
          setPassword("");
          setAuthMode("signin");
          setMessage(
            "Cadastro solicitado. Confirme seu e-mail, se necessário. " +
            "O acesso ao sistema depende de autorização explícita do administrador.",
          );
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) setError("Não foi possível autenticar. Verifique seus dados.");
        else {
          setPassword("");
          // Recreate route query observers with the authenticated session.
          window.location.assign(window.location.pathname);
        }
      }
    } catch {
      setError("Falha de conexão ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    queryClient.clear();
    setAccess("checking");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError("Não foi possível encerrar a sessão. Tente novamente.");
    else window.location.assign("/");
  }

  if (!ready || (session && access === "checking")) {
    return <div role="status" className="min-h-screen grid place-items-center text-muted-foreground">
      Verificando acesso ao InterMat...
    </div>;
  }

  if (!session || access === "denied") {
    return <div className="min-h-screen bg-muted/40 grid place-items-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-xl border bg-background p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">InterMat — acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session
              ? "Sua conta não possui autorização ativa. Solicite a liberação ao administrador."
              : "Entre com uma conta autorizada ou solicite o cadastro."}
          </p>
        </div>
        {session ? (
          <button type="button" onClick={() => { void signOut(); }}
            className="w-full rounded-md border px-4 py-2 text-sm font-medium">
            Sair da conta
          </button>
        ) : (
          <form onSubmit={(event) => { void submitCredentials(event); }} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="intermat-email">E-mail</label>
            <input id="intermat-email" type="email" autoComplete="username"
              required value={email} onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2" />
            <label className="block text-sm font-medium" htmlFor="intermat-password">Senha</label>
            <input id="intermat-password" type="password" autoComplete="current-password"
              required value={password} onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2" />
            <button type="submit" disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
              {submitting ? "Processando..." : authMode === "signup" ? "Solicitar cadastro" : "Entrar"}
            </button>
            <button
              type="button"
              className="w-full text-sm underline underline-offset-4"
              onClick={() => {
                setAuthMode((current) => current === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
            >
              {authMode === "signin" ? "Criar conta" : "Já tenho conta"}
            </button>
          </form>
        )}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>;
  }

  return <RoleProvider role={access as AccessRole}>{children}</RoleProvider>;
}

export function AppShell(props: AppShellProps) {
  return <AuthGate><AuthenticatedShell {...props} /></AuthGate>;
}

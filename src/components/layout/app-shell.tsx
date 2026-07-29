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
import type { ReactNode } from "react";

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

export function AppShell({ title, description, actions, children }: AppShellProps) {
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
            {NAV_ITEMS.map((item) => (
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

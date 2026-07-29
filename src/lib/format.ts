const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function formatCurrency(centavos: number): string {
  return BRL.format(centavos / 100);
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function isOverdue(prazoIso: string): boolean {
  return new Date(prazoIso).getTime() < Date.now();
}

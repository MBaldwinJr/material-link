import { createContext, useContext, type ReactNode } from "react";

export type AccessRole = "admin" | "gestor" | "operador" | "consulta";

const RoleContext = createContext<AccessRole | null>(null);

export function RoleProvider({
  role,
  children,
}: {
  readonly role: AccessRole;
  readonly children: ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useAccessRole(): AccessRole | null {
  return useContext(RoleContext);
}

export function RoleAccess({
  roles,
  children,
}: {
  readonly roles: readonly AccessRole[];
  readonly children: ReactNode;
}) {
  const role = useAccessRole();
  return role && roles.includes(role) ? <>{children}</> : null;
}

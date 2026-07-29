import { createId, getDatabase, mutate } from "./mock-db";
import type { Empresa, EmpresaStatus } from "@/types/domain";

export interface EmpresaInput {
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
  readonly limiteCentavos: number;
  readonly prazoPadraoDias: number;
  readonly observacoes: string;
}

export function listEmpresas(): Empresa[] {
  return [...getDatabase().empresas].sort((a, b) =>
    a.nomeFantasia.localeCompare(b.nomeFantasia),
  );
}

export function getEmpresa(id: string): Empresa | undefined {
  return getDatabase().empresas.find((empresa) => empresa.id === id);
}

export function createEmpresa(input: EmpresaInput): Empresa {
  const empresa: Empresa = {
    ...input,
    id: createId("emp"),
    criadoEm: new Date().toISOString(),
  };
  mutate((db) => {
    db.empresas.push(empresa);
    db.auditoria.unshift({
      id: createId("aud"),
      usuario: "usuario.atual",
      acao: "Cadastro de empresa",
      entidade: empresa.nomeFantasia,
      data: empresa.criadoEm,
      detalhes: `CNPJ ${empresa.cnpj}`,
    });
  });
  return empresa;
}

// P0 integration checks. Runs ONLY against a disposable Supabase staging project.
// Usage: INTERMAT_TEST_WRITES=YES_STAGING_ONLY ... node --test tests/p0.integration.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const get = (name) => process.env[name];
const required = [
  "INTERMAT_TEST_SUPABASE_URL",
  "INTERMAT_TEST_SUPABASE_PUBLISHABLE_KEY",
  "INTERMAT_TEST_ADMIN_EMAIL",
  "INTERMAT_TEST_ADMIN_PASSWORD",
];
if (get("INTERMAT_TEST_WRITES") !== "YES_STAGING_ONLY" ||
    required.some((name) => !get(name))) {
  throw new Error("P0 tests require an explicit staging-only opt-in and test credentials.");
}
const url = get("INTERMAT_TEST_SUPABASE_URL");
const key = get("INTERMAT_TEST_SUPABASE_PUBLISHABLE_KEY");
const authorized = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const anonymous = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function assertSuccess(result, label) {
  assert.ifError(result.error, label);
  assert.ok(result.data, label);
  return result.data;
}

test("P0: anonymous access denied; concurrent writes are atomic", async () => {
  // No test setup is performed until authenticated staging access is verified.
  const { data: signIn, error: signInError } = await authorized.auth.signInWithPassword({
    email: get("INTERMAT_TEST_ADMIN_EMAIL"),
    password: get("INTERMAT_TEST_ADMIN_PASSWORD"),
  });
  assert.ifError(signInError);
  assert.ok(signIn.user, "staging administrator must exist");

  const role = await authorized.from("inter_mat_operadores")
    .select("papel,ativo").eq("usuario_id", signIn.user.id).single();
  assertSuccess(role, "operator membership");
  assert.equal(role.data.ativo, true);
  assert.ok(["admin", "gestor"].includes(role.data.papel), "test account must manage catalog");

  const anonymousLoan = await anonymous.rpc("registrar_emprestimo_seguro", {
    p_empresa_id: randomUUID(), p_produto_id: randomUUID(), p_quantidade: 1,
    p_valor_unitario_centavos: 100, p_data: new Date().toISOString(),
    p_prazo_devolucao: new Date(Date.now() + 86400000).toISOString(),
    p_responsavel: "P0 test", p_motorista: "", p_veiculo: "", p_observacoes: ""
  });
  assert.ok(anonymousLoan.error, "anonymous RPC must be denied");

  // Deliberately create disposable fixtures in a NON-PRODUCTION project.
  const suffix = randomUUID();
  const cnpj = String(Math.floor(Math.random() * 9e13 + 1e13));
  const company = assertSuccess(await authorized.from("empresas").insert({
    razao_social: "P0 TESTE - REMOVER",
    nome_fantasia: "P0 " + suffix,
    cnpj, status: "ativa", limite_centavos: 0,
  }).select().single(), "create staging company");
  const product = assertSuccess(await authorized.from("produtos").insert({
    codigo: "P0-" + suffix,
    descricao: "P0 TESTE - REMOVER",
    unidade: "UN", estoque_atual: 1, estoque_minimo: 0,
    custo_centavos: 50, venda_centavos: 100
  }).select().single(), "create staging product");

  const anonymousRead = await anonymous.from("empresas").select("id").eq("id", company.id);
  assert.ok(anonymousRead.error || anonymousRead.data?.length === 0,
    "anonymous role must never see the fixture company");
  const loanArgs = {
    p_empresa_id: company.id, p_produto_id: product.id, p_quantidade: 1,
    p_valor_unitario_centavos: 100, p_data: new Date().toISOString(),
    p_prazo_devolucao: new Date(Date.now() + 86400000).toISOString(),
    p_responsavel: "P0 test", p_motorista: "", p_veiculo: "", p_observacoes: ""
  };
  const loans = await Promise.all([
    authorized.rpc("registrar_emprestimo_seguro", loanArgs),
    authorized.rpc("registrar_emprestimo_seguro", loanArgs),
  ]);
  assert.equal(loans.filter((r) => !r.error).length, 1, "only one loan can consume last unit");
  assert.equal(loans.filter((r) => r.error).length, 1, "concurrent overdraw must fail");
  const loan = loans.find((r) => !r.error).data;

  const afterLoan = assertSuccess(await authorized.from("produtos")
    .select("estoque_atual").eq("id", product.id).single(), "read inventory");
  assert.equal(Number(afterLoan.estoque_atual), 0);
  const loanMovements = assertSuccess(await authorized.from("movimentacoes_estoque")
    .select("id,tipo").eq("origem", loan.numero), "loan movements");
  assert.equal(loanMovements.filter((m) => m.tipo === "saida").length, 1);

  const returnArgs = {
    p_emprestimo_id: loan.id, p_tipo: "total", p_quantidade: 1,
    p_responsavel: "P0 test", p_observacoes: ""
  };
  const returns = await Promise.all([
    authorized.rpc("registrar_devolucao_segura", returnArgs),
    authorized.rpc("registrar_devolucao_segura", returnArgs),
  ]);
  assert.equal(returns.filter((r) => !r.error).length, 1, "only one return can settle the loan");
  assert.equal(returns.filter((r) => r.error).length, 1);
  const finalLoan = assertSuccess(await authorized.from("emprestimos")
    .select("quantidade_devolvida,status").eq("id", loan.id).single(), "final loan");
  assert.equal(Number(finalLoan.quantidade_devolvida), 1);
  assert.equal(finalLoan.status, "devolvido");
  const finalProduct = assertSuccess(await authorized.from("produtos")
    .select("estoque_atual").eq("id", product.id).single(), "final inventory");
  assert.equal(Number(finalProduct.estoque_atual), 1);
  const returnRows = assertSuccess(await authorized.from("devolucoes")
    .select("id").eq("emprestimo_id", loan.id), "returns history");
  assert.equal(returnRows.length, 1);
  const allMovements = assertSuccess(await authorized.from("movimentacoes_estoque")
    .select("id,tipo").eq("origem", loan.numero), "all movements");
  assert.equal(allMovements.length, 2);
});

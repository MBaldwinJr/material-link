"""Real parallel-session concurrency proof using disposable CI PostgreSQL.

No prod credentials are permitted. Each client is a separate psql connection.
"""
import concurrent.futures
import json
import os
import subprocess
import uuid

assert os.environ.get("MATERIAL_LINK_CI_EPHEMERAL") == "YES"

A = "11111111-1111-4111-8111-111111111111"
B = "22222222-2222-4222-8222-222222222222"


def sql(query: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", query],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def ok(query: str) -> str:
    result = sql(query)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def action(user: str, org: str, kind: str, args: dict) -> str:
    payload = json.dumps(args).replace("'", "''")
    return (
        "BEGIN; SET LOCAL ROLE authenticated;"
        f"SET LOCAL request.jwt.claim.sub = '{user}';"
        f"SELECT public.rede_operar('{org}','{kind}',"
        f"'{payload}'::jsonb)::text; COMMIT;"
    )


def execute(user: str, org: str, kind: str, args: dict) -> dict:
    result = ok(action(user, org, kind, args))
    return json.loads(result.splitlines()[0])


def race(query1: str, query2: str):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(sql, [query1, query2]))
    successes = [r for r in results if r.returncode == 0]
    failures = [r for r in results if r.returncode != 0]
    assert len(successes) == 1 and len(failures) == 1, [
        (r.returncode, r.stdout, r.stderr) for r in results
    ]
    return json.loads(successes[0].stdout.splitlines()[0]), failures[0]


a = ok("SELECT id FROM public.rede_organizacoes WHERE cnpj='00000000000001'")
b = ok("SELECT id FROM public.rede_organizacoes WHERE cnpj='00000000000002'")

product = execute(A, a, "criar_produto", {
    "codigo": "CONCUR-001",
    "descricao": "Um único item",
    "estoque": 1,
    "unidade": "UN",
})
offer = execute(A, a, "publicar_oferta", {
    "produto_id": product["id"],
    "preco_centavos": 1000,
})
loans = [
    execute(B, b, "solicitar_emprestimo", {
        "oferta_id": offer["id"],
        "quantidade": 1,
        "prazo_devolucao": "2026-12-01T10:00:00Z",
        "idempotency_key": f"concurrency-{uuid.uuid4()}",
    })
    for _ in range(2)
]

success, failure = race(
    action(A, a, "aceitar_emprestimo", {
        "emprestimo_id": loans[0]["id"], "expected_version": 1,
    }),
    action(A, a, "aceitar_emprestimo", {
        "emprestimo_id": loans[1]["id"], "expected_version": 1,
    }),
)
assert "Estoque disponível insuficiente" in failure.stderr, failure.stderr
accepted_id = success["id"]
assert ok(
    f"SELECT reservado::float8 FROM public.rede_produtos WHERE id='{product['id']}'"
) == "1"
assert ok(
    f"SELECT count(*) FROM public.rede_emprestimos "
    f"WHERE produto_id='{product['id']}' AND status='aceito'"
) == "1"

dispatched = execute(A, a, "expedir_emprestimo", {
    "emprestimo_id": accepted_id, "expected_version": 2,
})
assert dispatched["status"] == "expedido"
received = execute(B, b, "confirmar_recebimento", {
    "emprestimo_id": accepted_id, "expected_version": 3,
})
assert received["status"] == "recebido"
sent = execute(B, b, "enviar_devolucao", {
    "emprestimo_id": accepted_id,
    "expected_version": 4,
    "quantidade": 1,
    "idempotency_key": f"return-{uuid.uuid4()}",
})
assert sent["status"] == "em_transito"

settled, rejected = race(
    action(A, a, "confirmar_devolucao", {
        "devolucao_id": sent["id"], "expected_version": 5,
    }),
    action(A, a, "confirmar_devolucao", {
        "devolucao_id": sent["id"], "expected_version": 5,
    }),
)
assert settled["status"] == "concluido"
assert "não autorizada" in rejected.stderr or "mudou" in rejected.stderr
assert ok(
    f"SELECT estoque::float8 FROM public.rede_produtos WHERE id='{product['id']}'"
) == "1"
assert ok(
    f"SELECT count(*) FROM public.rede_movimentos "
    f"WHERE produto_id='{product['id']}'"
) == "2"

# A borrower retry after closure must still be safe/idempotent.
retried = execute(B, b, "enviar_devolucao", {
    "emprestimo_id": accepted_id,
    "expected_version": 6,
    "quantidade": 1,
    "idempotency_key": sent["chave_idempotencia"],
})
assert retried["id"] == sent["id"]

# Revocation must immediately deny data access without refreshing the JWT.
ok(
    "UPDATE public.rede_membros SET ativo=false WHERE "
    f"organizacao_id='{a}' AND usuario_id='{A}'"
)
after_revoke = sql(
    "BEGIN; SET LOCAL ROLE authenticated;"
    f"SET LOCAL request.jwt.claim.sub='{A}';"
    "SELECT count(*) FROM public.rede_produtos; COMMIT;"
)
assert after_revoke.returncode == 0, after_revoke.stderr
assert after_revoke.stdout.strip() == "0", after_revoke.stdout
unauthorized = sql(action(A, a, "criar_produto", {
    "codigo": "SHOULD-FAIL", "descricao": "Unauthorized", "estoque": 1,
}))
assert unauthorized.returncode != 0
assert "Sem vínculo ativo" in unauthorized.stderr

print("MODEL B PASS: concurrent reservations/returns, idempotency, revocation.")

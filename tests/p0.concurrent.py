"""P0 concurrent real-Postgres smoke test, CI disposable database only.

Runs two simultaneous independent PostgreSQL sessions against the same row.
Requires the local CI Postgres fixtures from tests/p0.postgres.smoke.sql.
Never configure against production.
"""
import concurrent.futures
import os
import re
import subprocess

assert os.environ.get("INTERMAT_P0_CI_POSTGRES") == "YES_DISPOSABLE_CI_ONLY"

UUID_ADMIN = "11111111-1111-4111-8111-111111111111"
COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
RACE_PRODUCT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"


def psql(sql):
    return subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True,
        capture_output=True,
        check=False,
        timeout=25,
    )


def must_pass(sql, desc):
    outcome = psql(sql)
    assert outcome.returncode == 0, f"{desc}: {outcome.stderr}"
    return outcome.stdout.strip()


def operator_sql(statement):
    return (
        "BEGIN; "
        "SET LOCAL ROLE authenticated; "
        f"SET LOCAL request.jwt.claim.sub = '{UUID_ADMIN}'; "
        f"{statement}; COMMIT;"
    )


def parallel(statements):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(psql, statements))
    successful = [item for item in results if item.returncode == 0]
    failed = [item for item in results if item.returncode != 0]
    assert len(successful) == 1 and len(failed) == 1, (
        "Expected one successful and one rejected transaction: "
        + repr([(r.returncode, r.stdout, r.stderr) for r in results])
    )
    return successful[0], failed[0]


must_pass(
    "INSERT INTO public.produtos (id,codigo,descricao,unidade,estoque_atual) "
    f"VALUES ('{RACE_PRODUCT}','P0-RACE','Concorrencia','UN',1)",
    "prepare single-unit fixture",
)

create = (
    "SELECT (public.registrar_emprestimo_seguro("
    f"'{COMPANY}','{RACE_PRODUCT}',1,100,now(),"
    "now() + interval '7 days','P0 concorrencia','','','')).id"
)
success, rejected = parallel([operator_sql(create)] * 2)
match = re.search(r"[0-9a-f]{8}-[0-9a-f-]{27,}", success.stdout)
assert match, success.stdout
loan_id = match.group(0)
assert "Estoque insuficiente" in rejected.stderr, rejected.stderr
assert must_pass(
    f"SELECT estoque_atual FROM public.produtos WHERE id='{RACE_PRODUCT}'",
    "check remaining inventory",
) == "0"
assert must_pass(
    f"SELECT count(*) FROM public.emprestimos WHERE produto_id='{RACE_PRODUCT}'",
    "check concurrent loans",
) == "1"

return_sql = (
    "SELECT (public.registrar_devolucao_segura("
    f"'{loan_id}','total',1,'P0 concorrencia','')).id"
)
success_return, rejected_return = parallel([operator_sql(return_sql)] * 2)
assert "Quantidade excede o saldo pendente" in rejected_return.stderr, (
    rejected_return.stderr
)
assert must_pass(
    f"SELECT estoque_atual FROM public.produtos WHERE id='{RACE_PRODUCT}'",
    "check returned inventory",
) == "1"
assert must_pass(
    f"SELECT count(*) FROM public.devolucoes WHERE emprestimo_id='{loan_id}'",
    "check concurrent returns",
) == "1"
assert must_pass(
    f"SELECT count(*) FROM public.movimentacoes_estoque WHERE produto_id='{RACE_PRODUCT}'",
    "check concurrent stock ledger",
) == "2"
print("P0 PASS: two concurrent loans and returns settled exactly once.")

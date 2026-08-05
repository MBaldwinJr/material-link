-- Initial schema for InterMat - Gestão de Empréstimos de Materiais

-- 1. Empresas
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    responsavel TEXT,
    cidade TEXT,
    estado TEXT,
    status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'suspensa', 'bloqueada')),
    limite_centavos BIGINT NOT NULL DEFAULT 0,
    prazo_padrao_dias INTEGER NOT NULL DEFAULT 30,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all companies" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage all companies" ON public.empresas FOR ALL TO authenticated USING (true);

-- 2. Produtos
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    codigo_barras TEXT,
    descricao TEXT NOT NULL,
    marca TEXT,
    categoria TEXT,
    fornecedor TEXT,
    unidade TEXT NOT NULL,
    custo_centavos BIGINT NOT NULL DEFAULT 0,
    venda_centavos BIGINT NOT NULL DEFAULT 0,
    estoque_atual NUMERIC NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC NOT NULL DEFAULT 0,
    localizacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all products" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage all products" ON public.produtos FOR ALL TO authenticated USING (true);

-- 3. Empréstimos
CREATE TABLE public.emprestimos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT UNIQUE NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    produto_id UUID NOT NULL REFERENCES public.produtos(id),
    quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
    quantidade_devolvida NUMERIC NOT NULL DEFAULT 0,
    valor_unitario_centavos BIGINT NOT NULL DEFAULT 0,
    data TIMESTAMPTZ NOT NULL DEFAULT now(),
    prazo_devolucao TIMESTAMPTZ NOT NULL,
    responsavel TEXT,
    motorista TEXT,
    veiculo TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'parcial', 'devolvido', 'atrasado')),
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emprestimos TO authenticated;
GRANT ALL ON public.emprestimos TO service_role;
ALTER TABLE public.emprestimos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all loans" ON public.emprestimos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage all loans" ON public.emprestimos FOR ALL TO authenticated USING (true);

-- 4. Devoluções
CREATE TABLE public.devolucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emprestimo_id UUID NOT NULL REFERENCES public.emprestimos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('total', 'parcial', 'troca', 'avaria', 'perda')),
    quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
    data TIMESTAMPTZ NOT NULL DEFAULT now(),
    responsavel TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucoes TO authenticated;
GRANT ALL ON public.devolucoes TO service_role;
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all returns" ON public.devolucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage all returns" ON public.devolucoes FOR ALL TO authenticated USING (true);

-- 5. Movimentações de Estoque
CREATE TABLE public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id),
    empresa_id UUID REFERENCES public.empresas(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('saida', 'entrada')),
    quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
    usuario TEXT,
    data TIMESTAMPTZ NOT NULL DEFAULT now(),
    origem TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all stock movements" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage all stock movements" ON public.movimentacoes_estoque FOR ALL TO authenticated USING (true);

-- 6. Auditoria
CREATE TABLE public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario TEXT,
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    data TIMESTAMPTZ NOT NULL DEFAULT now(),
    detalhes JSONB
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all audit logs" ON public.auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage all audit logs" ON public.auditoria FOR ALL TO authenticated USING (true);

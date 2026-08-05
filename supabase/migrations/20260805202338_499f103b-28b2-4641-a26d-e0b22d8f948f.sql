-- Missing operational tables
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnh TEXT NOT NULL,
  telefone TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas TO authenticated;
GRANT ALL ON public.motoristas TO service_role;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access to motoristas" ON public.motoristas FOR ALL TO authenticated USING (true);

CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  capacidade TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access to veiculos" ON public.veiculos FOR ALL TO authenticated USING (true);

-- Insert demo data
INSERT INTO public.motoristas (nome, cnh, telefone) VALUES 
('Jorge Lima', '0123456789', '(11) 98111-2233'),
('Paulo Reis', '9876543210', '(19) 99444-5566');

INSERT INTO public.veiculos (placa, modelo, capacidade) VALUES 
('FMH-2214', 'Truck Mercedes Atego', '12t'),
('KLM-8890', 'VUC Iveco Daily', '3,5t');

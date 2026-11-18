-- Model B: company membership invitations with one-time opaque tokens.
-- Only verified Supabase Auth email owner can accept. No public write grants.
CREATE TABLE public.rede_convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.rede_organizacoes(id),
  email_normalizado TEXT NOT NULL,
  papel TEXT NOT NULL CHECK(papel IN
    ('administrador','comercial','estoque','financeiro','consulta')),
  token_hash TEXT NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  aceito_em TIMESTAMPTZ,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rede_convites_email ON public.rede_convites(email_normalizado,expira_em);
ALTER TABLE public.rede_convites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rede_convites FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.rede_convites TO authenticated;
CREATE POLICY rede_convites_manager_select ON public.rede_convites
  FOR SELECT TO authenticated USING (
    rede_private.has_role(organizacao_id,
      ARRAY['proprietario','administrador'])
  );

CREATE OR REPLACE FUNCTION rede_private.convidar_membro(
  p_organizacao_id UUID,p_email TEXT,p_papel TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor UUID := (SELECT auth.uid());
  v_email TEXT := lower(btrim(p_email));
  v_token TEXT;
  v_expira TIMESTAMPTZ := now()+interval '7 days';
BEGIN
  IF v_actor IS NULL OR
     NOT rede_private.has_role(p_organizacao_id,
       ARRAY['proprietario','administrador']) THEN
    RAISE EXCEPTION 'Somente gestores podem convidar colaboradores'
      USING ERRCODE='42501';
  END IF;
  IF (SELECT status FROM public.rede_organizacoes
      WHERE id=p_organizacao_id) <> 'ativa' THEN
    RAISE EXCEPTION 'Organização ainda não está habilitada' USING ERRCODE='23514';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' OR
     p_papel NOT IN ('administrador','comercial','estoque','financeiro','consulta') THEN
    RAISE EXCEPTION 'Email ou papel inválido' USING ERRCODE='22023';
  END IF;
  IF p_papel='administrador' AND NOT rede_private.has_role(
    p_organizacao_id,ARRAY['proprietario']) THEN
    RAISE EXCEPTION 'Somente o proprietário pode convidar administradores'
      USING ERRCODE='42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.rede_membros m
    JOIN auth.users u ON u.id=m.usuario_id
    WHERE m.organizacao_id=p_organizacao_id AND m.ativo
      AND lower(u.email)=v_email
  ) THEN
    RAISE EXCEPTION 'Usuário já pertence à organização' USING ERRCODE='23505';
  END IF;
  -- 256 bits from two independent secure random UUIDs.
  v_token := replace(gen_random_uuid()::TEXT,'-','') ||
             replace(gen_random_uuid()::TEXT,'-','');
  INSERT INTO public.rede_convites(
    organizacao_id,email_normalizado,papel,token_hash,expira_em,criado_por
  ) VALUES (
    p_organizacao_id,v_email,p_papel,
    encode(sha256(convert_to(v_token,'UTF8')),'hex'),
    v_expira,v_actor
  );
  -- The raw token is returned ONCE; only a digest persists.
  RETURN jsonb_build_object('token',v_token,'email',v_email,
    'papel',p_papel,'expira_em',v_expira);
END $$;

CREATE OR REPLACE FUNCTION rede_private.aceitar_convite(
  p_token TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID := (SELECT auth.uid());
  v_email TEXT;
  v_invite public.rede_convites%ROWTYPE;
BEGIN
  IF v_user IS NULL OR p_token IS NULL OR length(p_token) <> 64
    OR p_token !~ '^[0-9a-f]+$' THEN
    RAISE EXCEPTION 'Convite inválido' USING ERRCODE='42501';
  END IF;
  SELECT lower(email) INTO v_email FROM auth.users
    WHERE id=v_user AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Confirme o e-mail antes de aceitar o convite'
      USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_invite FROM public.rede_convites
    WHERE token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
    FOR UPDATE;
  IF NOT FOUND OR v_invite.aceito_em IS NOT NULL
    OR v_invite.expira_em < now()
    OR v_invite.email_normalizado <> v_email
    OR (SELECT status FROM public.rede_organizacoes
        WHERE id=v_invite.organizacao_id) <> 'ativa' THEN
    RAISE EXCEPTION 'Convite inválido, expirado ou emitido para outra conta'
      USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rede_membros
    WHERE organizacao_id=v_invite.organizacao_id
      AND usuario_id=v_user AND ativo) THEN
    RAISE EXCEPTION 'Usuário já pertence à organização' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.rede_membros(organizacao_id,usuario_id,papel,ativo)
    VALUES(v_invite.organizacao_id,v_user,v_invite.papel,true)
    ON CONFLICT(organizacao_id,usuario_id)
    DO UPDATE SET papel=excluded.papel,ativo=true;
  UPDATE public.rede_convites SET aceito_em=now() WHERE id=v_invite.id;
  RETURN jsonb_build_object('organizacao_id',v_invite.organizacao_id,
    'papel',v_invite.papel,'status','ativo');
END $$;

CREATE OR REPLACE FUNCTION public.rede_convidar_membro(
  p_organizacao_id UUID,p_email TEXT,p_papel TEXT
) RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT rede_private.convidar_membro(p_organizacao_id,p_email,p_papel) $$;

CREATE OR REPLACE FUNCTION public.rede_aceitar_convite(
  p_token TEXT
) RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT rede_private.aceitar_convite(p_token) $$;

REVOKE ALL ON FUNCTION rede_private.convidar_membro(UUID,TEXT,TEXT)
  FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION rede_private.aceitar_convite(TEXT)
  FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rede_convidar_membro(UUID,TEXT,TEXT)
  FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rede_aceitar_convite(TEXT)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rede_private.convidar_membro(UUID,TEXT,TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION rede_private.aceitar_convite(TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_convidar_membro(UUID,TEXT,TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_aceitar_convite(TEXT)
  TO authenticated;

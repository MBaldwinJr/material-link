-- Material Link / Modelo B — strict transactional command API.
-- All privileged implementations stay in unexposed rede_private schema.
-- Browser receives only invoker wrappers: no grants for direct business writes.

CREATE OR REPLACE FUNCTION rede_private.criar_organizacao(
  p_razao TEXT, p_nome TEXT, p_cnpj TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_user UUID := (SELECT auth.uid()); v_org public.rede_organizacoes;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Confirme seu e-mail antes de criar a organização'
      USING ERRCODE='42501';
  END IF;
  IF nullif(btrim(p_razao),'') IS NULL OR nullif(btrim(p_nome),'') IS NULL
     OR p_cnpj IS NULL OR p_cnpj !~ '^[0-9]{14}$' THEN
    RAISE EXCEPTION 'Dados da organização inválidos' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.rede_organizacoes(razao_social,nome_fantasia,cnpj)
    VALUES(btrim(p_razao),btrim(p_nome),p_cnpj)
    RETURNING * INTO v_org;
  INSERT INTO public.rede_membros(organizacao_id,usuario_id,papel)
    VALUES(v_org.id,v_user,'proprietario');
  RETURN to_jsonb(v_org);
END $$;

CREATE OR REPLACE FUNCTION rede_private.operar(
  p_organizacao_id UUID, p_acao TEXT, p_dados JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID := (SELECT auth.uid());
  v_target UUID;
  v_id UUID;
  v_par public.rede_parcerias%ROWTYPE;
  v_prod public.rede_produtos%ROWTYPE;
  v_offer public.rede_ofertas%ROWTYPE;
  v_loan public.rede_emprestimos%ROWTYPE;
  v_return public.rede_devolucoes%ROWTYPE;
  v_qty NUMERIC(18,3);
  v_pending NUMERIC(18,3);
  v_key TEXT;
  v_ver INTEGER;
  v_active BOOLEAN;
BEGIN
  IF v_user IS NULL OR p_organizacao_id IS NULL OR p_dados IS NULL
     OR jsonb_typeof(p_dados) <> 'object' THEN
    RAISE EXCEPTION 'Comando inválido ou não autenticado' USING ERRCODE='42501';
  END IF;

  -- Membership is always fetched from PostgreSQL, never from JWT metadata or
  -- from the client-selected organization in isolation.
  IF NOT rede_private.has_membership(p_organizacao_id) THEN
    RAISE EXCEPTION 'Sem vínculo ativo com esta organização' USING ERRCODE='42501';
  END IF;

  IF p_acao = 'solicitar_parceria' THEN
    IF NOT rede_private.has_role(p_organizacao_id,ARRAY[
        'proprietario','administrador','comercial']) THEN
      RAISE EXCEPTION 'Sem permissão de parceria' USING ERRCODE='42501';
    END IF;
    v_target := (p_dados->>'outra_organizacao_id')::UUID;
    IF v_target IS NULL OR v_target = p_organizacao_id THEN
      RAISE EXCEPTION 'Organização parceira inválida' USING ERRCODE='22023';
    END IF;
    IF (SELECT status FROM public.rede_organizacoes
        WHERE id=p_organizacao_id) <> 'ativa'
       OR (SELECT status FROM public.rede_organizacoes
        WHERE id=v_target) <> 'ativa' THEN
      RAISE EXCEPTION 'Ambas as empresas devem estar verificadas'
        USING ERRCODE='23514';
    END IF;
    INSERT INTO public.rede_parcerias(solicitante_id,convidada_id,solicitado_por)
      VALUES(p_organizacao_id,v_target,v_user)
      RETURNING * INTO v_par;
    RETURN to_jsonb(v_par);

  ELSIF p_acao = 'responder_parceria' THEN
    IF NOT rede_private.has_role(p_organizacao_id,ARRAY[
        'proprietario','administrador','comercial']) THEN
      RAISE EXCEPTION 'Sem permissão de parceria' USING ERRCODE='42501';
    END IF;
    v_id := (p_dados->>'parceria_id')::UUID;
    SELECT * INTO v_par FROM public.rede_parcerias
      WHERE id=v_id FOR UPDATE;
    IF NOT FOUND OR v_par.convidada_id <> p_organizacao_id
      OR v_par.status <> 'pendente' THEN
      RAISE EXCEPTION 'Convite inválido ou já decidido' USING ERRCODE='23514';
    END IF;
    IF (p_dados->>'aceitar')::BOOLEAN IS NULL THEN
      RAISE EXCEPTION 'Decisão obrigatória' USING ERRCODE='22023';
    END IF;
    UPDATE public.rede_parcerias SET
      status=CASE WHEN (p_dados->>'aceitar')::BOOLEAN THEN 'ativa' ELSE 'recusada' END,
      respondido_por=v_user, atualizado_em=now()
      WHERE id=v_id RETURNING * INTO v_par;
    RETURN to_jsonb(v_par);

  ELSIF p_acao = 'criar_produto' THEN
    IF NOT rede_private.has_role(p_organizacao_id,ARRAY[
        'proprietario','administrador','estoque']) THEN
      RAISE EXCEPTION 'Sem permissão para cadastrar estoque' USING ERRCODE='42501';
    END IF;
    IF (SELECT status FROM public.rede_organizacoes
        WHERE id=p_organizacao_id) <> 'ativa' THEN
      RAISE EXCEPTION 'Organização pendente de verificação' USING ERRCODE='23514';
    END IF;
    v_qty := COALESCE((p_dados->>'estoque')::NUMERIC,0);
    IF v_qty < 0 THEN RAISE EXCEPTION 'Saldo inicial inválido' USING ERRCODE='23514'; END IF;
    INSERT INTO public.rede_produtos(
      organizacao_id,codigo,descricao,unidade,estoque,
      custo_privado_centavos,preco_venda_privado_centavos
    ) VALUES(
      p_organizacao_id, btrim(p_dados->>'codigo'),
      btrim(p_dados->>'descricao'),
      COALESCE(nullif(btrim(p_dados->>'unidade'),''),'UN'),
      v_qty,
      COALESCE((p_dados->>'custo_privado_centavos')::BIGINT,0),
      COALESCE((p_dados->>'preco_venda_privado_centavos')::BIGINT,0)
    ) RETURNING * INTO v_prod;
    RETURN to_jsonb(v_prod);

  ELSIF p_acao = 'publicar_oferta' THEN
    IF NOT rede_private.has_role(p_organizacao_id,ARRAY[
        'proprietario','administrador','comercial']) THEN
      RAISE EXCEPTION 'Sem permissão de publicação' USING ERRCODE='42501';
    END IF;
    IF (SELECT status FROM public.rede_organizacoes
        WHERE id=p_organizacao_id) <> 'ativa' THEN
      RAISE EXCEPTION 'Organização pendente de verificação' USING ERRCODE='23514';
    END IF;
    v_id := (p_dados->>'produto_id')::UUID;
    SELECT * INTO v_prod FROM public.rede_produtos
      WHERE id=v_id AND organizacao_id=p_organizacao_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não pertence à organização' USING ERRCODE='42501';
    END IF;
    INSERT INTO public.rede_ofertas(
      organizacao_id,produto_id,descricao_publica,unidade,preco_acordavel_centavos
    ) VALUES (
      p_organizacao_id,v_prod.id,v_prod.descricao,v_prod.unidade,
      COALESCE((p_dados->>'preco_centavos')::BIGINT,0)
    ) RETURNING * INTO v_offer;
    RETURN to_jsonb(v_offer);

  ELSIF p_acao = 'solicitar_emprestimo' THEN
    IF NOT rede_private.has_role(p_organizacao_id,ARRAY[
        'proprietario','administrador','comercial']) THEN
      RAISE EXCEPTION 'Sem permissão para solicitar' USING ERRCODE='42501';
    END IF;
    v_id := (p_dados->>'oferta_id')::UUID;
    v_qty := (p_dados->>'quantidade')::NUMERIC;
    v_key := btrim(p_dados->>'idempotency_key');
    IF v_qty IS NULL OR v_qty <= 0 OR v_key IS NULL OR length(v_key) < 8
      OR (p_dados->>'prazo_devolucao')::TIMESTAMPTZ <= now() THEN
      RAISE EXCEPTION 'Quantidade, prazo ou chave inválida' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_offer FROM public.rede_ofertas WHERE id=v_id AND ativa;
    IF NOT FOUND OR v_offer.organizacao_id = p_organizacao_id THEN
      RAISE EXCEPTION 'Oferta não disponível para esta empresa' USING ERRCODE='23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.rede_parcerias p
      WHERE p.status='ativa'
        AND p_organizacao_id IN (p.solicitante_id,p.convidada_id)
        AND v_offer.organizacao_id IN (p.solicitante_id,p.convidada_id)
    ) THEN
      RAISE EXCEPTION 'É necessária uma parceria ativa' USING ERRCODE='42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.rede_organizacoes
      WHERE id IN (p_organizacao_id,v_offer.organizacao_id)
        AND status <> 'ativa') THEN
      RAISE EXCEPTION 'Organização não verificada' USING ERRCODE='42501';
    END IF;
    INSERT INTO public.rede_emprestimos(
      cedente_id,tomadora_id,oferta_id,produto_id,quantidade,
      valor_unitario_centavos,descricao_snapshot,unidade_snapshot,
      prazo_devolucao,chave_idempotencia,criado_por
    ) VALUES (
      v_offer.organizacao_id,p_organizacao_id,v_offer.id,v_offer.produto_id,
      v_qty,v_offer.preco_acordavel_centavos,
      v_offer.descricao_publica,v_offer.unidade,
      (p_dados->>'prazo_devolucao')::TIMESTAMPTZ,v_key,v_user
    ) ON CONFLICT (tomadora_id,chave_idempotencia) DO NOTHING
      RETURNING * INTO v_loan;
    IF NOT FOUND THEN
      SELECT * INTO STRICT v_loan FROM public.rede_emprestimos
        WHERE tomadora_id=p_organizacao_id AND chave_idempotencia=v_key;
      IF v_loan.oferta_id <> v_offer.id OR v_loan.quantidade <> v_qty
        OR v_loan.prazo_devolucao <> (p_dados->>'prazo_devolucao')::TIMESTAMPTZ THEN
        RAISE EXCEPTION 'Chave de idempotência reutilizada com dados diferentes'
          USING ERRCODE='23505';
      END IF;
      RETURN to_jsonb(v_loan);
    END IF;
    INSERT INTO public.rede_eventos(
      emprestimo_id,organizacao_ator_id,usuario_ator_id,evento,versao
    ) VALUES(v_loan.id,p_organizacao_id,v_user,'solicitado',v_loan.versao);
    RETURN to_jsonb(v_loan);

  ELSIF p_acao IN ('aceitar_emprestimo','recusar_emprestimo',
                   'expedir_emprestimo','confirmar_recebimento',
                   'cancelar_emprestimo','cancelar_reserva','enviar_devolucao') THEN
    v_id := (p_dados->>'emprestimo_id')::UUID;
    SELECT * INTO v_loan FROM public.rede_emprestimos
      WHERE id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Empréstimo não encontrado' USING ERRCODE='23503'; END IF;
    v_ver := (p_dados->>'expected_version')::INTEGER;
    -- A return retry must resolve an existing idempotency key BEFORE
    -- rejecting the original expected_version. No new return bypasses it.
    IF p_acao <> 'enviar_devolucao' AND v_ver IS DISTINCT FROM v_loan.versao THEN
      RAISE EXCEPTION 'A operação mudou: atualize antes de confirmar' USING ERRCODE='40001';
    END IF;
    IF p_acao = 'aceitar_emprestimo' THEN
      IF v_loan.cedente_id <> p_organizacao_id
        OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
            'proprietario','administrador','comercial'])
        OR v_loan.status <> 'solicitado' THEN
        RAISE EXCEPTION 'Aceite não autorizado' USING ERRCODE='42501';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.rede_parcerias p WHERE p.status='ativa'
          AND v_loan.cedente_id IN (p.solicitante_id,p.convidada_id)
          AND v_loan.tomadora_id IN (p.solicitante_id,p.convidada_id)
      ) THEN
        RAISE EXCEPTION 'Parceria não está ativa' USING ERRCODE='42501';
      END IF;
      SELECT * INTO v_prod FROM public.rede_produtos
        WHERE id=v_loan.produto_id AND organizacao_id=p_organizacao_id
        FOR UPDATE;
      IF NOT FOUND OR v_prod.estoque - v_prod.reservado < v_loan.quantidade THEN
        RAISE EXCEPTION 'Estoque disponível insuficiente' USING ERRCODE='23514';
      END IF;
      UPDATE public.rede_produtos SET reservado=reservado+v_loan.quantidade
        WHERE id=v_prod.id;
      UPDATE public.rede_emprestimos
        SET status='aceito',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;

    ELSIF p_acao = 'recusar_emprestimo' THEN
      IF v_loan.cedente_id <> p_organizacao_id
        OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
            'proprietario','administrador','comercial'])
        OR v_loan.status <> 'solicitado' THEN
        RAISE EXCEPTION 'Recusa não autorizada' USING ERRCODE='42501';
      END IF;
      UPDATE public.rede_emprestimos SET
        status='recusado',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;

    ELSIF p_acao = 'cancelar_emprestimo' THEN
      IF v_loan.tomadora_id <> p_organizacao_id
        OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
            'proprietario','administrador','comercial'])
        OR v_loan.status <> 'solicitado' THEN
        RAISE EXCEPTION 'Cancelamento não autorizado' USING ERRCODE='42501';
      END IF;
      UPDATE public.rede_emprestimos SET
        status='cancelado',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;

    ELSIF p_acao = 'cancelar_reserva' THEN
      -- A mutually accepted loan can be cancelled before dispatch;
      -- release exactly its reservation, without touching physical stock.
      IF v_loan.status <> 'aceito'
         OR p_organizacao_id NOT IN (v_loan.cedente_id, v_loan.tomadora_id)
         OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
             'proprietario','administrador','comercial']) THEN
        RAISE EXCEPTION 'Cancelamento de reserva não autorizado'
          USING ERRCODE='42501';
      END IF;
      SELECT * INTO v_prod FROM public.rede_produtos
        WHERE id=v_loan.produto_id AND organizacao_id=v_loan.cedente_id
        FOR UPDATE;
      IF NOT FOUND OR v_prod.reservado < v_loan.quantidade THEN
        RAISE EXCEPTION 'Reserva de estoque inconsistente' USING ERRCODE='23514';
      END IF;
      UPDATE public.rede_produtos
        SET reservado=reservado-v_loan.quantidade WHERE id=v_prod.id;
      UPDATE public.rede_emprestimos
        SET status='cancelado',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;

    ELSIF p_acao = 'expedir_emprestimo' THEN
      IF v_loan.cedente_id <> p_organizacao_id
        OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
            'proprietario','administrador','estoque'])
        OR v_loan.status <> 'aceito' THEN
        RAISE EXCEPTION 'Expedição não autorizada' USING ERRCODE='42501';
      END IF;
      SELECT * INTO v_prod FROM public.rede_produtos
        WHERE id=v_loan.produto_id AND organizacao_id=p_organizacao_id
        FOR UPDATE;
      IF NOT FOUND OR v_prod.reservado < v_loan.quantidade
        OR v_prod.estoque < v_loan.quantidade THEN
        RAISE EXCEPTION 'Reserva de estoque insuficiente' USING ERRCODE='23514';
      END IF;
      UPDATE public.rede_produtos SET
        reservado=reservado-v_loan.quantidade,estoque=estoque-v_loan.quantidade
        WHERE id=v_prod.id;
      INSERT INTO public.rede_movimentos(
        organizacao_id,produto_id,emprestimo_id,tipo,quantidade,usuario_id
      ) VALUES(p_organizacao_id,v_prod.id,v_id,'saida',v_loan.quantidade,v_user);
      UPDATE public.rede_emprestimos SET
        status='expedido',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;

    ELSIF p_acao = 'confirmar_recebimento' THEN
      IF v_loan.tomadora_id <> p_organizacao_id
        OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
            'proprietario','administrador','estoque'])
        OR v_loan.status <> 'expedido' THEN
        RAISE EXCEPTION 'Recebimento não autorizado' USING ERRCODE='42501';
      END IF;
      INSERT INTO public.rede_custodia(
        emprestimo_id,tomadora_id,quantidade_recebida
      ) VALUES (v_id,p_organizacao_id,v_loan.quantidade);
      UPDATE public.rede_emprestimos SET
        status='recebido',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;

    ELSIF p_acao = 'enviar_devolucao' THEN
      IF v_loan.tomadora_id <> p_organizacao_id
        OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
            'proprietario','administrador','estoque']) THEN
        RAISE EXCEPTION 'Devolução não autorizada' USING ERRCODE='42501';
      END IF;
      v_qty := (p_dados->>'quantidade')::NUMERIC;
      v_key := btrim(p_dados->>'idempotency_key');
      IF v_qty IS NULL OR v_qty <= 0 OR v_key IS NULL OR length(v_key)<8 THEN
        RAISE EXCEPTION 'Devolução ou chave inválida' USING ERRCODE='22023';
      END IF;
      -- Locking the loan serializes all returns, including parallel ones.
      SELECT * INTO v_return FROM public.rede_devolucoes
        WHERE emprestimo_id=v_id AND chave_idempotencia=v_key;
      IF FOUND THEN
        IF v_return.quantidade <> v_qty THEN
          RAISE EXCEPTION 'Idempotência da devolução inválida' USING ERRCODE='23505';
        END IF;
        RETURN to_jsonb(v_return);
      END IF;
      IF v_ver IS DISTINCT FROM v_loan.versao THEN
        RAISE EXCEPTION 'A operação mudou: atualize antes de confirmar'
          USING ERRCODE='40001';
      END IF;
      IF v_loan.status NOT IN ('recebido','devolucao_em_transito') THEN
        RAISE EXCEPTION 'Empréstimo não aceita novas devoluções' USING ERRCODE='23514';
      END IF;
      SELECT COALESCE(SUM(quantidade),0) INTO v_pending
        FROM public.rede_devolucoes
        WHERE emprestimo_id=v_id AND status='em_transito';
      IF v_qty > v_loan.quantidade-v_loan.quantidade_devolvida-v_pending THEN
        RAISE EXCEPTION 'Devolução excede saldo disponível' USING ERRCODE='23514';
      END IF;
      INSERT INTO public.rede_devolucoes(
        emprestimo_id,quantidade,chave_idempotencia,solicitado_por
      ) VALUES(v_id,v_qty,v_key,v_user)
        RETURNING * INTO v_return;
      UPDATE public.rede_emprestimos SET
        status='devolucao_em_transito',versao=versao+1,atualizado_em=now()
        WHERE id=v_id RETURNING * INTO v_loan;
      INSERT INTO public.rede_eventos(
        emprestimo_id,organizacao_ator_id,usuario_ator_id,evento,
        versao,detalhes_publicos
      ) VALUES(v_id,p_organizacao_id,v_user,'enviar_devolucao',
        v_loan.versao,jsonb_build_object('devolucao_id',v_return.id,'quantidade',v_qty));
      RETURN to_jsonb(v_return);
    END IF;

    INSERT INTO public.rede_eventos(
      emprestimo_id,organizacao_ator_id,usuario_ator_id,evento,versao
    ) VALUES(v_id,p_organizacao_id,v_user,p_acao,v_loan.versao);
    RETURN to_jsonb(v_loan);

  ELSIF p_acao = 'confirmar_devolucao' THEN
    v_id := (p_dados->>'devolucao_id')::UUID;
    -- Lock loan first for ordering consistent with new returns.
    SELECT emprestimo_id INTO v_target
      FROM public.rede_devolucoes WHERE id=v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Devolução não encontrada' USING ERRCODE='23503';
    END IF;
    SELECT * INTO v_loan FROM public.rede_emprestimos
      WHERE id=v_target FOR UPDATE;
    SELECT * INTO v_return FROM public.rede_devolucoes
      WHERE id=v_id FOR UPDATE;
    IF v_loan.cedente_id <> p_organizacao_id
      OR NOT rede_private.has_role(p_organizacao_id,ARRAY[
        'proprietario','administrador','estoque'])
      OR v_return.status <> 'em_transito'
      OR v_loan.status <> 'devolucao_em_transito' THEN
      RAISE EXCEPTION 'Confirmação de retorno não autorizada' USING ERRCODE='42501';
    END IF;
    v_ver := (p_dados->>'expected_version')::INTEGER;
    IF v_ver IS DISTINCT FROM v_loan.versao THEN
      RAISE EXCEPTION 'Estado de devolução mudou' USING ERRCODE='40001';
    END IF;
    UPDATE public.rede_devolucoes
      SET status='confirmada',confirmado_por=v_user,confirmado_em=now()
      WHERE id=v_return.id RETURNING * INTO v_return;
    UPDATE public.rede_produtos SET estoque=estoque+v_return.quantidade
      WHERE id=v_loan.produto_id AND organizacao_id=p_organizacao_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto cedente não encontrado' USING ERRCODE='23503';
    END IF;
    UPDATE public.rede_custodia
      SET quantidade_devolvida=quantidade_devolvida+v_return.quantidade
      WHERE emprestimo_id=v_loan.id AND tomadora_id=v_loan.tomadora_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Custódia do tomador não encontrada' USING ERRCODE='23503';
    END IF;
    INSERT INTO public.rede_movimentos(
      organizacao_id,produto_id,emprestimo_id,devolucao_id,tipo,quantidade,usuario_id
    ) VALUES(p_organizacao_id,v_loan.produto_id,v_loan.id,
      v_return.id,'entrada',v_return.quantidade,v_user);
    SELECT EXISTS (
      SELECT 1 FROM public.rede_devolucoes
      WHERE emprestimo_id=v_loan.id AND status='em_transito'
    ) INTO v_active;
    UPDATE public.rede_emprestimos
      SET quantidade_devolvida=quantidade_devolvida+v_return.quantidade,
          status=CASE
            WHEN quantidade_devolvida+v_return.quantidade=quantidade THEN 'concluido'
            WHEN v_active THEN 'devolucao_em_transito'
            ELSE 'recebido'
          END,
          versao=versao+1,atualizado_em=now()
      WHERE id=v_loan.id RETURNING * INTO v_loan;
    INSERT INTO public.rede_eventos(
      emprestimo_id,organizacao_ator_id,usuario_ator_id,evento,
      versao,detalhes_publicos
    ) VALUES(v_loan.id,p_organizacao_id,v_user,'confirmar_devolucao',
      v_loan.versao,jsonb_build_object('devolucao_id',v_return.id,'quantidade',v_return.quantidade));
    RETURN to_jsonb(v_loan);
  ELSE
    RAISE EXCEPTION 'Ação não implementada ou não autorizada: %',p_acao
      USING ERRCODE='42501';
  END IF;
END $$;

-- Public invoker-only RPC wrappers; never expose SECURITY DEFINER
-- function definitions to PostgREST.
CREATE OR REPLACE FUNCTION public.rede_criar_organizacao(
  p_razao TEXT, p_nome TEXT, p_cnpj TEXT
) RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT rede_private.criar_organizacao(p_razao,p_nome,p_cnpj) $$;

CREATE OR REPLACE FUNCTION public.rede_operar(
  p_organizacao_id UUID, p_acao TEXT, p_dados JSONB
) RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT rede_private.operar(p_organizacao_id,p_acao,p_dados) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA rede_private FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rede_criar_organizacao(TEXT,TEXT,TEXT)
  FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rede_operar(UUID,TEXT,JSONB)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rede_private.criar_organizacao(TEXT,TEXT,TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION rede_private.operar(UUID,TEXT,JSONB)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_criar_organizacao(TEXT,TEXT,TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rede_operar(UUID,TEXT,JSONB)
  TO authenticated;

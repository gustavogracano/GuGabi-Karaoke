-- ==============================================================================
-- GuGabi Karaokê - Script SQL Pro / Enterprise para Supabase
-- Tabelas Principais, Histórico de Sessões, Reações Detalhadas, Fofocas VIP,
-- Views de Relatório, Índices Otimizados, RPCs e Realtime
-- ==============================================================================

-- 1. Tabela de Sessões / Histórico de Festas (Permite arquivar noites sem perder histórico)
CREATE TABLE IF NOT EXISTS public.karaoke_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Noite de Karaokê',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_songs INTEGER NOT NULL DEFAULT 0,
    total_reactions INTEGER NOT NULL DEFAULT 0,
    champion_name TEXT,
    champion_song TEXT,
    champion_votes INTEGER DEFAULT 0,
    most_canceled_name TEXT,
    most_canceled_tomatoes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela Principal da Fila (karaoke_queue)
CREATE TABLE IF NOT EXISTS public.karaoke_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.karaoke_sessions(id) ON DELETE SET NULL,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    singer_name TEXT NOT NULL,
    singer_tag TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'finished')),
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    positive_votes INTEGER NOT NULL DEFAULT 0,
    tomatoes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante que a coluna session_id exista caso a tabela já tenha sido criada antes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'karaoke_queue' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE public.karaoke_queue ADD COLUMN session_id UUID REFERENCES public.karaoke_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Tabela de Eventos em Tempo Real (karaoke_events)
CREATE TABLE IF NOT EXISTS public.karaoke_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.karaoke_sessions(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('emoji', 'sound', 'fofoca')),
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante que a coluna session_id exista em karaoke_events se já criada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'karaoke_events' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE public.karaoke_events ADD COLUMN session_id UUID REFERENCES public.karaoke_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Tabela de Reações Individuais (Quem votou em quem para o relatório detalhado de maior fã / jurado)
CREATE TABLE IF NOT EXISTS public.karaoke_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES public.karaoke_queue(id) ON DELETE CASCADE,
    voter_name TEXT NOT NULL DEFAULT 'Anônimo',
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'fire', 'clap', 'tomato')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Fofocas VIP (Para persistência e moderação completa)
CREATE TABLE IF NOT EXISTS public.karaoke_gossips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.karaoke_sessions(id) ON DELETE SET NULL,
    author TEXT DEFAULT 'Anônimo',
    text TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Índices Otimizados de Alta Performance
CREATE INDEX IF NOT EXISTS idx_karaoke_queue_status_priority 
ON public.karaoke_queue (status, is_priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_karaoke_queue_singer 
ON public.karaoke_queue (singer_name);

CREATE INDEX IF NOT EXISTS idx_karaoke_queue_session 
ON public.karaoke_queue (session_id);

CREATE INDEX IF NOT EXISTS idx_karaoke_events_created 
ON public.karaoke_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_karaoke_events_type_created 
ON public.karaoke_events (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_karaoke_reactions_queue 
ON public.karaoke_reactions (queue_id);

CREATE INDEX IF NOT EXISTS idx_karaoke_reactions_voter 
ON public.karaoke_reactions (voter_name);

CREATE INDEX IF NOT EXISTS idx_karaoke_gossips_created 
ON public.karaoke_gossips (created_at DESC);

-- 7. Views Inteligentes para Relatórios Automáticos

-- View 1: Pódio e Ranking Geral das Apresentações
CREATE OR REPLACE VIEW public.view_karaoke_ranking AS
SELECT 
    id,
    singer_name,
    title,
    singer_tag,
    positive_votes,
    tomatoes,
    (positive_votes + tomatoes) AS total_votes,
    CASE 
        WHEN (positive_votes + tomatoes) > 0 
        THEN ROUND((positive_votes::numeric / (positive_votes + tomatoes)::numeric) * 100, 1)
        ELSE 0 
    END AS approval_rating_percent,
    created_at
FROM public.karaoke_queue
WHERE status = 'finished'
ORDER BY positive_votes DESC, tomatoes ASC;

-- View 2: Estatísticas Consolidadas por Cantor (Maior Cantor, Aproveitamento Geral, etc.)
CREATE OR REPLACE VIEW public.view_singer_stats AS
SELECT 
    singer_name,
    COUNT(*) AS total_songs_sung,
    SUM(positive_votes) AS total_positive_votes,
    SUM(tomatoes) AS total_tomatoes,
    ROUND(AVG(positive_votes), 1) AS avg_votes_per_song,
    CASE 
        WHEN (SUM(positive_votes) + SUM(tomatoes)) > 0 
        THEN ROUND((SUM(positive_votes)::numeric / (SUM(positive_votes) + SUM(tomatoes))::numeric) * 100, 1)
        ELSE 0 
    END AS overall_approval_percent
FROM public.karaoke_queue
WHERE status = 'finished'
GROUP BY singer_name
ORDER BY total_songs_sung DESC, total_positive_votes DESC;

-- View 3: Resumo Executivo da Festa Atual (Festa Ativa)
CREATE OR REPLACE VIEW public.view_party_summary AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'finished') AS finished_songs_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_songs_count,
    COUNT(*) FILTER (WHERE status = 'playing') AS playing_songs_count,
    COUNT(DISTINCT singer_name) FILTER (WHERE status = 'finished') AS unique_singers_count,
    COALESCE(SUM(positive_votes) FILTER (WHERE status = 'finished'), 0) AS total_positive_votes,
    COALESCE(SUM(tomatoes) FILTER (WHERE status = 'finished'), 0) AS total_tomatoes,
    ROUND(COUNT(*) FILTER (WHERE status = 'finished') * 3.5, 0) AS estimated_party_minutes
FROM public.karaoke_queue
WHERE session_id IS NULL;

-- 8. Funções RPC Atômicas (Votos Concorrentes & Arquivamento de Sessões)
CREATE OR REPLACE FUNCTION public.increment_positive_votes(queue_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.karaoke_queue
    SET positive_votes = positive_votes + 1
    WHERE id = queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_tomatoes(queue_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.karaoke_queue
    SET tomatoes = tomatoes + 1
    WHERE id = queue_id;
END;
$$;

-- Função RPC para registrar reação detalhada e incrementar contador de uma só vez
CREATE OR REPLACE FUNCTION public.record_guest_reaction(
    p_queue_id UUID,
    p_voter_name TEXT,
    p_reaction_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insere registro da reação individual
    INSERT INTO public.karaoke_reactions (queue_id, voter_name, reaction_type)
    VALUES (p_queue_id, COALESCE(NULLIF(p_voter_name, ''), 'Anônimo'), p_reaction_type);

    -- Atualiza os contadores agregados em karaoke_queue
    IF p_reaction_type IN ('heart', 'fire', 'clap') THEN
        UPDATE public.karaoke_queue
        SET positive_votes = positive_votes + 1
        WHERE id = p_queue_id;
    ELSIF p_reaction_type = 'tomato' THEN
        UPDATE public.karaoke_queue
        SET tomatoes = tomatoes + 1
        WHERE id = p_queue_id;
    END IF;
END;
$$;

-- Função RPC para Arquivar a Sessão Atual (Salva os troféus no histórico e zera a fila limpa)
CREATE OR REPLACE FUNCTION public.archive_current_session(p_session_name TEXT DEFAULT 'Festa de Karaokê')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_total_songs INT;
    v_total_reactions INT;
    v_champ_name TEXT;
    v_champ_song TEXT;
    v_champ_votes INT;
    v_canceled_name TEXT;
    v_canceled_tomatoes INT;
BEGIN
    -- 1. Calcula totais da sessão atual
    SELECT COUNT(*), COALESCE(SUM(positive_votes + tomatoes), 0)
    INTO v_total_songs, v_total_reactions
    FROM public.karaoke_queue
    WHERE status = 'finished';

    -- 2. Identifica o campeão da noite
    SELECT singer_name, title, positive_votes
    INTO v_champ_name, v_champ_song, v_champ_votes
    FROM public.karaoke_queue
    WHERE status = 'finished'
    ORDER BY positive_votes DESC
    LIMIT 1;

    -- 3. Identifica o mais cancelado (mais tomates)
    SELECT singer_name, tomatoes
    INTO v_canceled_name, v_canceled_tomatoes
    FROM public.karaoke_queue
    WHERE status = 'finished' AND tomatoes > 0
    ORDER BY tomatoes DESC
    LIMIT 1;

    -- 4. Cria o registro na tabela de sessões históricas
    INSERT INTO public.karaoke_sessions (
        name,
        started_at,
        ended_at,
        total_songs,
        total_reactions,
        champion_name,
        champion_song,
        champion_votes,
        most_canceled_name,
        most_canceled_tomatoes
    )
    VALUES (
        COALESCE(NULLIF(p_session_name, ''), 'Noite de Karaokê'),
        (SELECT COALESCE(MIN(created_at), NOW()) FROM public.karaoke_queue),
        NOW(),
        COALESCE(v_total_songs, 0),
        COALESCE(v_total_reactions, 0),
        v_champ_name,
        v_champ_song,
        COALESCE(v_champ_votes, 0),
        v_canceled_name,
        COALESCE(v_canceled_tomatoes, 0)
    )
    RETURNING id INTO v_session_id;

    -- 5. Vincula as musicas e fofocas à sessão arquivada
    UPDATE public.karaoke_queue
    SET session_id = v_session_id
    WHERE session_id IS NULL AND status = 'finished';

    UPDATE public.karaoke_gossips
    SET session_id = v_session_id
    WHERE session_id IS NULL;

    -- 6. Limpa musicas pendentes/tocando nao concluidas e eventos temporarios de reacao
    DELETE FROM public.karaoke_queue WHERE session_id IS NULL;
    DELETE FROM public.karaoke_events;

    RETURN v_session_id;
END;
$$;

-- Permissões de Execução nas Funções RPC
GRANT EXECUTE ON FUNCTION public.increment_positive_votes(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tomatoes(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_guest_reaction(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_current_session(TEXT) TO anon, authenticated;

-- 9. Habilitação de RLS (Row Level Security) e Políticas Abertas
ALTER TABLE public.karaoke_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karaoke_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karaoke_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karaoke_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karaoke_gossips ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['karaoke_sessions', 'karaoke_queue', 'karaoke_events', 'karaoke_reactions', 'karaoke_gossips'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Permissao total SELECT em %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Permissao total SELECT em %I" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Permissao total INSERT em %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Permissao total INSERT em %I" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Permissao total UPDATE em %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Permissao total UPDATE em %I" ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Permissao total DELETE em %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Permissao total DELETE em %I" ON public.%I FOR DELETE TO anon, authenticated USING (true)', t, t);
    END LOOP;
END $$;

-- 10. Habilitação de Realtime no Supabase
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.karaoke_queue;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.karaoke_events;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.karaoke_sessions;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.karaoke_reactions;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.karaoke_gossips;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;

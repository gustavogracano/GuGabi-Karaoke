# 🎤 GuGabi Karaoke - Karaokê Colaborativo em Tempo Real

Uma aplicação web completa de karaokê colaborativo desenvolvida com **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** e **Supabase Realtime**.

Projetada para festas e encontros: o anfitrião abre a tela na TV da sala (`/tv`), e os convidados entram pelo celular escaneando o QR Code (`/controle`) para pedir músicas, votar, jogar tomates na tela e disparar sons ao vivo!

---

## 🚀 Arquitetura e Rotas

1. **`/tv` (Tela Principal - Mac / TV da Sala):**
   - Player central com YouTube e avanço automático de faixas.
   - Fila lateral translúcida com a música atual e as próximas da fila.
   - QR Code dinâmico apontando para o IP local (`http://192.168.x.x:3000/controle`).
   - Chuva de emojis flutuantes ao vivo (❤️, 🔥, 👏, 🍅).
   - Efeito **Tomataço**: 3 ou mais tomates em 4s geram uma mancha gigante na tela com áudio de splash por 2.5s.
   - Mesa de som automática reproduzindo áudios locais (`errou.mp3`, `aplausos.mp3`, `buzina.mp3`, `splash.mp3`).
   - Letreiro rodapé estilo notícias urgentes com as fofocas anônimas da plateia.

2. **`/controle` (Mobile dos Convidados):**
   - Identificação com nome e tags cômicas (*"Cantor de Chuveiro"*, *"Pagodeiro Nato"*, *"Inimigo do Ritmo"*, *"Só Canto Bêbado"*, etc.).
   - Busca de vídeos no YouTube ou inserção direta por link do YouTube.
   - Opção de 1 **Golden Ticket (Fura-Fila)** por convidado.
   - Acompanhamento da fila em tempo real com destaque para a própria música.
   - Barra de reações com ❤️, 🔥, 👏 e 🍅.
   - Mesa de som remota para trollar o cantor na TV da sala.
   - Envio de fofocas de bastidor (máx 60 caracteres).

3. **`/relatorio` (Resumo da Noite):**
   - **Hall da Fama:**
     - 👑 *A Voz da Noite* (maior pontuação de votos positivos).
     - 🍅 *O Mais Cancelado* (mais tomates acumulados).
     - ⚡ *Inimigo do Fim* (quem mais cantou).
   - Tabela cronológica completa de todas as músicas cantadas.
   - Mural das fofocas enviadas na sessão.
   - Botão **"Copiar Resumo"** que gera mensagem formatada com emojis pronta para o WhatsApp.

---

## 🛠️ Passo a Passo de Configuração

### 1. Banco de Dados (Supabase)
1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. Acesse o **SQL Editor** do Supabase.
3. Copie e cole todo o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**.
   - Isso criará as tabelas `karaoke_queue` e `karaoke_events`, as funções RPC atômicas, as políticas de segurança RLS e habilitará o Realtime.

### 2. Variáveis de Ambiente (`.env.local`)
No Supabase, acesse **Project Settings -> API** e copie os valores:
Crie ou edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI

# Opcional (para busca ilimitada via YouTube Data API v3):
YOUTUBE_API_KEY=SUA_CHAVE_DO_GOOGLE_AQUI
```
*(Nota: mesmo sem `YOUTUBE_API_KEY`, a busca possui catálogo demonstrativo e suporte a colar qualquer link direto do YouTube).*

### 3. Rodando Localmente
Instale as dependências e inicie o servidor:

```bash
npm install
npm run dev
```

Abra no navegador do Mac conectado à TV:
- `http://localhost:3000/tv`

Para os convidados no celular (conectados ao mesmo Wi-Fi):
- Basta apontar a câmera do celular para o QR Code exibido na tela da TV!

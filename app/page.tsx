import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  Tv,
  Smartphone,
  BarChart3,
  Mic2,
  Sparkles,
  Database,
  Radio,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen stage-bg text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      <div className="stage-spotlight" />

      {/* HEADER */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-[0_0_25px_rgba(255,0,127,0.5)]">
            <Mic2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-1.5">
              GUGABI<span className="text-neon-pink">KARAOKE</span>
            </h1>
            <p className="text-xs text-slate-400">Karaokê Colaborativo em Tempo Real</p>
          </div>
        </div>

        {/* Status de Configuração */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md ${
            configured
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-300 border-amber-500/40"
          }`}
        >
          {configured ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Supabase Configurado</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Configure .env.local</span>
            </>
          )}
        </div>
      </header>

      {/* HERO & CARDS DE ACESSO RÁPIDO */}
      <main className="max-w-5xl mx-auto w-full my-auto py-12 z-10 space-y-10">
        <div className="text-center space-y-4">
          <span className="bg-pink-600/20 text-pink-300 text-xs font-extrabold px-3 py-1.5 rounded-full border border-pink-500/40 uppercase tracking-widest inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Next.js + Supabase Realtime
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            A Experiência Definitiva de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400">
              Karaokê com a Galera
            </span>
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Abra a tela da TV no Mac conectado ao som da sala e deixe os convidados controlarem a fila, mandarem fofocas e jogarem tomates pelo celular!
          </p>
        </div>

        {/* SELEÇÃO DAS 3 ROTAS PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: /tv */}
          <Link
            href="/tv"
            className="group relative bg-stage-card border border-pink-500/30 hover:border-pink-500/80 rounded-3xl p-6 transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(255,0,127,0.3)] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-lg">
                <Tv className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-pink-400 transition-colors flex items-center gap-2">
                  <span>Tela da TV / Mac</span>
                  <span className="text-xs bg-pink-600/30 text-pink-300 px-2 py-0.5 rounded-md font-mono">
                    /tv
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Para abrir no Mac conectado à TV e caixa de som. Player com YouTube, fila translúcida, chuva de emojis, efeito tomataço e letreiro de fofocas.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-pink-400">
              <span>Abrir Palco TV</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: /controle */}
          <Link
            href="/controle"
            className="group relative bg-stage-card border border-cyan-500/30 hover:border-cyan-500/80 rounded-3xl p-6 transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(0,240,255,0.3)] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all shadow-lg">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <span>Controle Mobile</span>
                  <span className="text-xs bg-cyan-600/30 text-cyan-300 px-2 py-0.5 rounded-md font-mono">
                    /controle
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Para os convidados no celular via QR Code. Escolha de tag engraçada, busca de músicas, botões ❤️, 🔥, 👏, 🍅, mesa de som e envio de fofocas.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-cyan-400">
              <span>Abrir no Celular</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: /relatorio */}
          <Link
            href="/relatorio"
            className="group relative bg-stage-card border border-purple-500/30 hover:border-purple-500/80 rounded-3xl p-6 transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(168,85,247,0.3)] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-lg">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                  <span>Resumo da Noite</span>
                  <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-md font-mono">
                    /relatorio
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Para ver quem foi "A Voz da Noite", "O Mais Cancelado" com tomates, mural das fofocas e botão de 1 clique para copiar o resumo estilizado para o WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-purple-400">
              <span>Ver Premiações</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* BANNER DE PRIMEIROS PASSOS */}
        {!configured && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Passo 1: Conecte seu Supabase
              </h4>
              <p className="text-xs text-slate-300">
                Execute o script em <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200">supabase/schema.sql</code> no SQL Editor do Supabase e adicione suas credenciais no arquivo <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200">.env.local</code>.
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold bg-amber-500 text-black px-4 py-2 rounded-xl">
              Pronto para rodar!
            </span>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 pt-6 border-t border-white/5 z-10">
        GuGabi Karaoke • Desenvolvido com Next.js 15, Tailwind CSS, Supabase Realtime & YouTube API
      </footer>
    </div>
  );
}

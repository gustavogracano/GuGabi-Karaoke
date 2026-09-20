import Link from "next/link";
import { Mic2, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen stage-bg text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-pink-600/30 border border-pink-500/50 flex items-center justify-center mb-4 text-pink-400">
        <Mic2 className="w-8 h-8" />
      </div>
      <h2 className="text-4xl font-black">404 - Fora do Tom!</h2>
      <p className="text-slate-400 text-sm mt-2 mb-6 max-w-sm">
        A página que você está procurando não foi encontrada no repertório da festa.
      </p>
      <Link
        href="/"
        className="bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-black px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao Início</span>
      </Link>
    </div>
  );
}

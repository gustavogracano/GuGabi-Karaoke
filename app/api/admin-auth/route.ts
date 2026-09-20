import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ success: false, error: 'PIN inválido.' }, { status: 400 });
    }

    // PIN configurado via env (fallback para 8569 se não definido)
    const correctPin = process.env.ADMIN_PIN || '8569';

    if (pin.trim() === correctPin.trim()) {
      return NextResponse.json({ success: true });
    } else {
      // Delay para dificultar brute-force
      await new Promise(resolve => setTimeout(resolve, 500));
      return NextResponse.json({ success: false, error: 'Senha incorreta.' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao validar PIN.' }, { status: 500 });
  }
}

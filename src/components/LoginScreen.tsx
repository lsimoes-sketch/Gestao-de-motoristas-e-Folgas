import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isEmailAllowed } from '../lib/sharedStore';

/**
 * Ecrã de entrada: o utilizador escreve o email e recebe um link de acesso.
 * Só emails que estejam na lista da equipa recebem o link.
 */
export const LoginScreen: React.FC<{ errorMessage?: string | null }> = ({ errorMessage }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    errorMessage ? 'error' : 'idle'
  );
  const [message, setMessage] = useState<string | null>(errorMessage || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !supabase) return;

    setStatus('sending');
    setMessage(null);
    try {
      const allowed = await isEmailAllowed(clean);
      if (!allowed) {
        setStatus('error');
        setMessage(
          'Este email não tem acesso à app. Peça a um colega da equipa para o adicionar em "Equipa".'
        );
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      const msg = String(err?.message || err);
      setMessage(
        /rate limit|security purposes/i.test(msg)
          ? 'Foram pedidos demasiados links em pouco tempo. Aguarde um minuto e tente novamente.'
          : /not authorized/i.test(msg)
          ? 'O email está na equipa, mas o serviço de envio de emails ainda não está configurado para enviar para este endereço. Avise o administrador (configuração SMTP no Supabase).'
          : `Não foi possível enviar o link: ${msg}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-900 text-white items-center justify-center shadow-sm mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Transfers & Tours Ops</h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de motoristas, frota e escalas</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          {status === 'sent' ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">Verifique o seu email</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Enviámos um link de acesso para <strong className="text-slate-900">{email.trim().toLowerCase()}</strong>.
                Abra-o neste ou noutro dispositivo para entrar.
              </p>
              <p className="text-xs text-slate-400">Não chegou? Veja a pasta de spam ou peça outro link.</p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Usar outro email / pedir novo link
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Entrar</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Receba um link de acesso no seu email. Não precisa de palavra-passe.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Email</span>
                <div className="mt-1 relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nome@empresa.pt"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </label>

              {status === 'error' && message && (
                <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />A enviar…
                  </>
                ) : (
                  <>
                    Enviar link de acesso
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Acesso reservado à equipa. Os dados ficam numa base de dados na UE.
        </p>
      </div>
    </div>
  );
};

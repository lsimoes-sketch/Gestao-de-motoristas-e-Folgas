import React, { useEffect, useState } from 'react';
import { Users, X, UserPlus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { TeamMember, listTeamMembers, addTeamMember, removeTeamMember } from '../lib/sharedStore';

interface TeamAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

/** Gestão de quem tem acesso à app (lista da equipa). */
export const TeamAccessModal: React.FC<TeamAccessModalProps> = ({ isOpen, onClose, currentEmail }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await listTeamMembers());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      await addTeamMember(email, currentEmail);
      setNewEmail('');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (email === currentEmail.toLowerCase()) {
      setError('Não pode remover o seu próprio acesso.');
      return;
    }
    if (members.length <= 1) {
      setError('Tem de ficar pelo menos uma pessoa com acesso.');
      return;
    }
    if (!window.confirm(`Retirar o acesso de ${email}? Deixa de conseguir ver ou alterar dados.`)) return;
    setBusy(true);
    setError(null);
    try {
      await removeTeamMember(email);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Equipa com acesso</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Todas as pessoas nesta lista veem e alteram a mesma informação. Para dar acesso, adicione o email
            da pessoa; depois ela entra na app com esse email e recebe um link de acesso.
          </p>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="email"
              required
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="email@colega.pt"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Dar acesso
            </button>
          </form>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> A carregar…
              </div>
            ) : (
              members.map(m => (
                <div key={m.email} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {m.email}
                      {m.email === currentEmail.toLowerCase() && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">você</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Desde {new Date(m.added_at).toLocaleDateString('pt-PT')}
                      {m.added_by ? ` • adicionado por ${m.added_by}` : ''}
                    </div>
                  </div>
                  {m.email !== currentEmail.toLowerCase() && (
                    <button
                      onClick={() => handleRemove(m.email)}
                      disabled={busy}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Retirar acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Ligação à base de dados partilhada (Supabase).
 *
 * O URL e a chave pública abaixo são seguros para estarem no código: a chave
 * "publishable" só dá acesso ao que as regras de segurança (RLS) permitem, e
 * essas regras só deixam ler/alterar dados a quem tem login E está na lista
 * da equipa (tabela team_members).
 *
 * Podem ser substituídos por variáveis de ambiente no Vercel:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 * Para correr a app só com dados locais (sem base partilhada), defina
 *   VITE_SUPABASE_URL=off
 */
const DEFAULT_SUPABASE_URL = 'https://aldpsevnssxcibrhltqu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BzV6Ri-Os5F3Zivn240QFQ_SqBEbZfZ';

const env = (import.meta as any).env || {};
const url: string = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const key: string = env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

/** true quando a app trabalha com a base de dados partilhada da equipa. */
export const isSharedMode = url !== 'off' && !!url && !!key;

export const supabase: SupabaseClient | null = isSharedMode
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Fluxo "implicit": o link do email funciona mesmo se for aberto noutro dispositivo
        flowType: 'implicit',
      },
    })
  : null;

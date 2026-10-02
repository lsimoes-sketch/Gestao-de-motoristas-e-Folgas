import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AppStoragePayload } from '../utils/storage';

/**
 * Sincronização entre o estado da app e a base de dados partilhada.
 *
 * Cada coleção da app corresponde a uma tabela com (id, data jsonb).
 * - loadAll(): lê tudo depois do login.
 * - pushChanges(): grava só o que mudou (inserções/alterações e remoções).
 * - subscribeToChanges(): recebe em tempo real as alterações feitas por colegas.
 */

export type CollectionKey = keyof AppStoragePayload;

export const COLLECTION_TABLES: Record<CollectionKey, string> = {
  drivers: 'drivers',
  vehicles: 'vehicles',
  services: 'services',
  allocations: 'allocations',
  shiftScales: 'shift_scales',
  dayOffs: 'day_offs',
  settlements: 'settlements',
};

export const COLLECTION_KEYS = Object.keys(COLLECTION_TABLES) as CollectionKey[];

/**
 * JSON canónico (chaves ordenadas). O Postgres reordena as chaves dos objetos
 * JSONB, por isso a comparação tem de ignorar a ordem para não haver gravações
 * em ciclo entre a app e a base de dados.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: any): any {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.keys(value)
      .sort()
      .forEach(k => {
        if (value[k] !== undefined) out[k] = normalize(value[k]);
      });
    return out;
  }
  return value;
}

/** Mapa id -> JSON canónico do registo tal como está gravado na base de dados. */
export type SyncedSnapshot = Record<CollectionKey, Map<string, string>>;

export function emptySnapshot(): SyncedSnapshot {
  return COLLECTION_KEYS.reduce((acc, k) => {
    acc[k] = new Map();
    return acc;
  }, {} as SyncedSnapshot);
}

function requireClient() {
  if (!supabase) throw new Error('Base de dados partilhada não configurada.');
  return supabase;
}

export async function loadAll(): Promise<{ payload: AppStoragePayload; snapshot: SyncedSnapshot }> {
  const client = requireClient();
  const snapshot = emptySnapshot();
  const payload = {} as AppStoragePayload;

  await Promise.all(
    COLLECTION_KEYS.map(async key => {
      const table = COLLECTION_TABLES[key];
      const rows: { id: string; data: any }[] = [];
      // Paginação simples (o Supabase devolve no máximo 1000 linhas por pedido)
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await client
          .from(table)
          .select('id, data')
          .order('id')
          .range(from, from + pageSize - 1);
        if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      (payload as any)[key] = rows.map(r => r.data);
      rows.forEach(r => snapshot[key].set(r.id, stableStringify(r.data)));
    })
  );

  return { payload, snapshot };
}

/**
 * Compara o estado atual com o que está gravado e envia só as diferenças.
 * Atualiza o snapshot apenas depois de a base de dados confirmar.
 * Devolve o número de registos alterados.
 */
export async function pushChanges(
  current: AppStoragePayload,
  snapshot: SyncedSnapshot,
  client: Pick<NonNullable<typeof supabase>, 'from'> = requireClient()
): Promise<number> {
  let changed = 0;

  for (const key of COLLECTION_KEYS) {
    const table = COLLECTION_TABLES[key];
    const items = (current[key] as { id: string }[]) || [];
    const synced = snapshot[key];

    const seen = new Set<string>();
    const upserts: { id: string; data: any }[] = [];
    items.forEach(item => {
      if (!item || !item.id) return;
      seen.add(item.id);
      const json = stableStringify(item);
      if (synced.get(item.id) !== json) upserts.push({ id: item.id, data: item });
    });
    const deletes = [...synced.keys()].filter(id => !seen.has(id));

    if (upserts.length > 0) {
      const { error } = await client.from(table).upsert(upserts, { onConflict: 'id' });
      if (error) throw new Error(`Erro ao gravar ${table}: ${error.message}`);
      upserts.forEach(u => synced.set(u.id, stableStringify(u.data)));
      changed += upserts.length;
    }

    if (deletes.length > 0) {
      const { error } = await client.from(table).delete().in('id', deletes);
      if (error) throw new Error(`Erro ao apagar em ${table}: ${error.message}`);
      deletes.forEach(id => synced.delete(id));
      changed += deletes.length;
    }
  }

  return changed;
}

export interface RemoteChange {
  key: CollectionKey;
  type: 'UPSERT' | 'DELETE';
  id: string;
  data?: any;
}

/** Subscreve alterações em tempo real de todas as tabelas. */
export function subscribeToChanges(
  onChange: (change: RemoteChange) => void,
  onStatus?: (status: string) => void
): () => void {
  const client = requireClient();
  let channel: RealtimeChannel = client.channel('operacao-partilhada');

  COLLECTION_KEYS.forEach(key => {
    const table = COLLECTION_TABLES[key];
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
      if (payload.eventType === 'DELETE') {
        const id = (payload.old as any)?.id;
        if (id) onChange({ key, type: 'DELETE', id });
      } else {
        const row = payload.new as any;
        if (row?.id) onChange({ key, type: 'UPSERT', id: row.id, data: row.data });
      }
    });
  });

  channel.subscribe(status => onStatus?.(status));

  return () => {
    client.removeChannel(channel);
  };
}

/* ---------------------------- Equipa (acessos) ---------------------------- */

export interface TeamMember {
  email: string;
  added_at: string;
  added_by: string | null;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await requireClient()
    .from('team_members')
    .select('email, added_at, added_by')
    .order('added_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addTeamMember(email: string, addedBy: string): Promise<void> {
  const { error } = await requireClient()
    .from('team_members')
    .insert({ email: email.trim().toLowerCase(), added_by: addedBy });
  if (error) {
    if (error.code === '23505') throw new Error('Este email já tem acesso.');
    throw new Error(error.message);
  }
}

export async function removeTeamMember(email: string): Promise<void> {
  const { error } = await requireClient().from('team_members').delete().eq('email', email);
  if (error) throw new Error(error.message);
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const { data, error } = await requireClient().rpc('is_email_allowed', { check_email: email });
  if (error) throw new Error(error.message);
  return data === true;
}

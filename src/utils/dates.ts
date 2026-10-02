/**
 * Utilitários de datas da operação.
 *
 * Todas as datas da app são guardadas como texto local sem fuso horário
 * ("AAAA-MM-DD" ou "AAAA-MM-DDTHH:mm"), sempre na hora de Lisboa.
 * Estas funções devolvem "hoje" e "agora" nesse mesmo formato, para que as
 * comparações de texto funcionem corretamente seja qual for o fuso do browser.
 */

export const OPERATION_TIME_ZONE = 'Europe/Lisbon';

function partsInZone(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: OPERATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, string> = {};
  formatter.formatToParts(date).forEach(p => {
    parts[p.type] = p.value;
  });
  return parts;
}

/** Data de hoje em Lisboa, no formato AAAA-MM-DD. */
export function getTodayStr(now: Date = new Date()): string {
  const p = partsInZone(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Data e hora atuais em Lisboa, no formato AAAA-MM-DDTHH:mm (igual aos serviços). */
export function getNowLocalStr(now: Date = new Date()): string {
  const p = partsInZone(now);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Soma (ou subtrai) dias a uma data AAAA-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Dia da semana de uma data AAAA-MM-DD (0 = Domingo, 6 = Sábado). */
export function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Segunda-feira da semana a que a data pertence. */
export function getMondayOf(dateStr: string): string {
  const weekday = getWeekday(dateStr);
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dateStr, diff);
}

/** Número da semana ISO 8601. */
export function getIsoWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** "07 Set" a partir de "2026-09-07". */
export function formatDayMonthShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d} ${MONTHS_SHORT[Number(m) - 1]}`;
}

/** "Setembro 2026" a partir de "2026-09-07". */
export function formatMonthYear(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  return `${MONTHS_FULL[Number(m) - 1]} ${y}`;
}

/** "07/09/2026" a partir de "2026-09-07". */
export function formatDatePt(dateStr: string): string {
  return dateStr.split('-').reverse().join('/');
}

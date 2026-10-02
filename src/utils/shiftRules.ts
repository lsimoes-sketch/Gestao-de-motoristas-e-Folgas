/**
 * Regras de horário dos motoristas.
 *
 * REGRA 1 — Início de jornada (definida pela operação, 02/10/2026)
 * O início da jornada é calculado a partir do PRIMEIRO serviço do dia do motorista:
 *  • Início no Aeroporto de Lisboa (chegadas, e qualquer outro serviço que comece lá):
 *      30 min antes da hora marcada em hora de ponta (dias úteis, 07:00–10:00 e 17:00–20:00);
 *      15 min antes nos restantes períodos, fins de semana e feriados.
 *  • Início numa morada da cidade de Lisboa (saídas para o aeroporto, transfers para
 *    qualquer outro destino, tours, disposições…):
 *      1h15 antes em hora de ponta; 1h00 nos restantes períodos, fins de semana e feriados.
 *  • Qualquer outro primeiro serviço: assinalado para inserir o início manualmente.
 * Um início inserido manualmente (exceção) prevalece sempre sobre o calculado.
 *
 * Os valores estão em SHIFT_RULES_CONFIG para poderem ser ajustados num só sítio.
 */
import { TransportService, Allocation, Driver, WorkDayRecord } from '../types';
import { addDays, getWeekday } from './dates';

export const SHIFT_RULES_CONFIG = {
  /** Janelas de hora de ponta (inclusive nos dois extremos), só em dias úteis */
  peakWindows: [
    { from: '07:00', to: '10:00' },
    { from: '17:00', to: '20:00' },
  ],
  // Valores revistos pela operação a 02/10/2026
  arrivalAirport: { peakMinutes: 30, offPeakMinutes: 15 },
  departureLisbon: { peakMinutes: 75, offPeakMinutes: 60 },
  /** 13 de junho (Santo António) — feriado municipal de Lisboa */
  includeLisbonMunicipalHoliday: true,
};

/* ------------------------------------------------------------------ */
/* Calendário: feriados e hora de ponta                                */
/* ------------------------------------------------------------------ */

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const holidayCache = new Map<number, Map<string, string>>();

/** Feriados nacionais de Portugal (+ Santo António em Lisboa, se configurado). */
export function getHolidays(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const y = String(year);
  const list: [string, string][] = [
    [`${y}-01-01`, 'Ano Novo'],
    [addDays(easter, -2), 'Sexta-feira Santa'],
    [easter, 'Páscoa'],
    [`${y}-04-25`, 'Dia da Liberdade'],
    [`${y}-05-01`, 'Dia do Trabalhador'],
    [addDays(easter, 60), 'Corpo de Deus'],
    [`${y}-06-10`, 'Dia de Portugal'],
    [`${y}-08-15`, 'Assunção de Nossa Senhora'],
    [`${y}-10-05`, 'Implantação da República'],
    [`${y}-11-01`, 'Todos os Santos'],
    [`${y}-12-01`, 'Restauração da Independência'],
    [`${y}-12-08`, 'Imaculada Conceição'],
    [`${y}-12-25`, 'Natal'],
  ];
  if (SHIFT_RULES_CONFIG.includeLisbonMunicipalHoliday) list.push([`${y}-06-13`, 'Santo António (Lisboa)']);
  const map = new Map(list);
  holidayCache.set(year, map);
  return map;
}

export function getHolidayName(dateStr: string): string | undefined {
  return getHolidays(Number(dateStr.slice(0, 4))).get(dateStr);
}

export type DayKind = 'UTIL' | 'FIM_DE_SEMANA' | 'FERIADO';

export function getDayKind(dateStr: string): DayKind {
  if (getHolidayName(dateStr)) return 'FERIADO';
  const wd = getWeekday(dateStr);
  return wd === 0 || wd === 6 ? 'FIM_DE_SEMANA' : 'UTIL';
}

/** Hora de ponta: dia útil (não feriado) e hora dentro de uma das janelas. */
export function isPeakTime(dateStr: string, time: string): boolean {
  if (getDayKind(dateStr) !== 'UTIL') return false;
  return SHIFT_RULES_CONFIG.peakWindows.some(w => time >= w.from && time <= w.to);
}

/* ------------------------------------------------------------------ */
/* Locais: Aeroporto de Lisboa e moradas em Lisboa                      */
/* ------------------------------------------------------------------ */

const AIRPORT_RE = /aeroporto|airport|aerogare|\bterminal [12]\b/i;
const LISBON_AIRPORT_RE = /humberto delgado|aeroporto (internacional )?de lisboa|lisbon airport|\(LIS\)|\bLIS\b|1700-111/i;

export function isAirport(text: string): boolean {
  return AIRPORT_RE.test(text || '');
}

export function isLisbonAirport(text: string): boolean {
  const t = text || '';
  if (LISBON_AIRPORT_RE.test(t)) return true;
  // "Aeroporto" sem cidade identificada, mas com código postal de Lisboa
  return isAirport(t) && /\b1\d{3}-\d{3}\b/.test(t);
}

/**
 * Morada no concelho de Lisboa: código postal 1000-1999; sem código postal,
 * aceita a palavra "Lisboa"/"Lisbon" no texto. Aeroportos não contam como morada.
 */
export function isLisbonAddress(text: string): boolean {
  const t = text || '';
  if (!t.trim() || isAirport(t)) return false;
  const postal = /\b(\d{4})-\d{3}\b/.exec(t);
  if (postal) return Number(postal[1]) >= 1000 && Number(postal[1]) <= 1999;
  return /\blisboa\b|\blisbon\b/i.test(t);
}

/* ------------------------------------------------------------------ */
/* Regra 1: início de jornada                                          */
/* ------------------------------------------------------------------ */

export type StartRuleKind = 'CHEGADA_AEROPORTO' | 'SAIDA_LISBOA' | 'MANUAL';

export interface StartRuleResult {
  kind: StartRuleKind;
  peak: boolean;
  dayKind: DayKind;
  leadMinutes?: number;
  /** Início calculado, AAAA-MM-DDTHH:mm (undefined se for manual) */
  calculatedStart?: string;
  /** Explicação curta para o ecrã */
  explanation: string;
}

function minusMinutes(dateTime: string, minutes: number): string {
  const [date, time] = dateTime.split('T');
  const [h, m] = time.split(':').map(Number);
  let total = h * 60 + m - minutes;
  let day = date;
  while (total < 0) {
    total += 1440;
    day = addDays(day, -1);
  }
  return `${day}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function originText(s: TransportService): string {
  return s.originAddress || s.origin || '';
}
function destinationText(s: TransportService): string {
  return s.destinationAddress || s.destination || '';
}

export function computeShiftStart(first: TransportService): StartRuleResult {
  const [date, time] = first.scheduledStart.split('T');
  const dayKind = getDayKind(date);
  const peak = isPeakTime(date, time);
  const periodLabel = peak
    ? 'hora de ponta'
    : dayKind === 'FERIADO'
    ? `feriado (${getHolidayName(date)})`
    : dayKind === 'FIM_DE_SEMANA'
    ? 'fim de semana'
    : 'fora da hora de ponta';

  const origin = originText(first);
  const destination = destinationText(first);
  const isTransfer = first.type === 'TRANSFER';
  const TYPE_LABEL: Record<string, string> = {
    TOUR_MEIO_DIA: 'Tour de meio dia',
    TOUR_DIA_INTEIRO: 'Tour de dia inteiro',
    DISPOSICAO: 'Disposição',
  };
  const what = isTransfer ? '' : `${TYPE_LABEL[first.type] || 'Serviço'} (tratado como transfer) — `;
  const leadLabel = (lead: number) =>
    lead >= 60 ? `${Math.floor(lead / 60)}h${lead % 60 ? String(lead % 60).padStart(2, '0') : ''}` : `${lead} min`;

  // Começa no Aeroporto de Lisboa → regra da chegada (transfers e, por extensão, outros serviços)
  const isArrival = isLisbonAirport(origin) && !(isTransfer && first.transferDirection === 'SAIDA');
  if (isArrival) {
    const lead = peak ? SHIFT_RULES_CONFIG.arrivalAirport.peakMinutes : SHIFT_RULES_CONFIG.arrivalAirport.offPeakMinutes;
    return {
      kind: 'CHEGADA_AEROPORTO',
      peak,
      dayKind,
      leadMinutes: lead,
      calculatedStart: minusMinutes(first.scheduledStart, lead),
      explanation: `${what}Início no Aeroporto de Lisboa às ${time}, ${periodLabel}: −${leadLabel(lead)}`,
    };
  }

  // Começa numa morada da cidade de Lisboa → regra da saída (qualquer destino e qualquer tipo de serviço)
  const isDeparture = isLisbonAddress(origin);
  if (isDeparture) {
    const lead = peak ? SHIFT_RULES_CONFIG.departureLisbon.peakMinutes : SHIFT_RULES_CONFIG.departureLisbon.offPeakMinutes;
    return {
      kind: 'SAIDA_LISBOA',
      peak,
      dayKind,
      leadMinutes: lead,
      calculatedStart: minusMinutes(first.scheduledStart, lead),
      explanation: `${what}Início em morada de Lisboa às ${time}, ${periodLabel}: −${leadLabel(lead)}`,
    };
  }

  let why = 'o primeiro serviço não começa no Aeroporto de Lisboa nem numa morada em Lisboa';
  if (isAirport(origin) && !isLisbonAirport(origin)) why = 'começa num aeroporto que não é o de Lisboa';
  else if (!origin.trim()) why = 'o primeiro serviço não tem local de início';
  else if (!/\b\d{4}-\d{3}\b/.test(origin) && !/\blisboa\b|\blisbon\b/i.test(origin))
    why = 'local de início sem código postal (reimporte a Agenda ou insira à mão)';
  else why = 'começa fora da cidade de Lisboa';
  return { kind: 'MANUAL', peak, dayKind, explanation: `Inserir manualmente: ${why}` };
}

/* ------------------------------------------------------------------ */
/* Jornadas do dia                                                     */
/* ------------------------------------------------------------------ */

export interface DriverDayShift {
  driver: Driver;
  date: string;
  services: { service: TransportService; allocation: Allocation }[];
  first: TransportService;
  rule: StartRuleResult;
  record?: WorkDayRecord;
  /** Início que conta: manual (exceção) > calculado pela regra */
  effectiveStart?: string;
  startSource: 'MANUAL' | 'REGRA' | 'PENDENTE';
  /** Fim do último serviço (real se existir, senão previsto) */
  lastEnd: string;
}

export function workDayId(driverId: string, date: string): string {
  return `${driverId}__${date}`;
}

export function getDayShifts(
  date: string,
  services: TransportService[],
  allocations: Allocation[],
  drivers: Driver[],
  workDays: WorkDayRecord[]
): DriverDayShift[] {
  const serviceById = new Map(services.map(s => [s.id, s]));
  const byDriver = new Map<string, { service: TransportService; allocation: Allocation }[]>();

  allocations.forEach(a => {
    if (!a.driverId || a.status === 'CANCELADO') return;
    const s = serviceById.get(a.serviceId);
    if (!s || s.status === 'CANCELADO') return;
    if (s.scheduledStart.slice(0, 10) !== date) return;
    const list = byDriver.get(a.driverId) || [];
    list.push({ service: s, allocation: a });
    byDriver.set(a.driverId, list);
  });

  const result: DriverDayShift[] = [];
  byDriver.forEach((list, driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    list.sort((x, y) => x.service.scheduledStart.localeCompare(y.service.scheduledStart));
    const first = list[0].service;
    const rule = computeShiftStart(first);
    const record = workDays.find(w => w.id === workDayId(driverId, date));
    const manual = record?.startOverride;
    const effectiveStart = manual || rule.calculatedStart;
    const lastEnd = list
      .map(x => x.allocation.actualEnd || x.service.scheduledEnd)
      .sort()
      .slice(-1)[0];
    result.push({
      driver,
      date,
      services: list,
      first,
      rule,
      record,
      effectiveStart,
      startSource: manual ? 'MANUAL' : rule.calculatedStart ? 'REGRA' : 'PENDENTE',
      lastEnd,
    });
  });

  return result.sort((a, b) => a.first.scheduledStart.localeCompare(b.first.scheduledStart));
}

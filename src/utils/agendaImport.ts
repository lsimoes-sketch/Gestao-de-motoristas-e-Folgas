/**
 * Importação da Agenda da plataforma Alliance4Drive (Exportar → Excel).
 *
 * - Lê o .xlsx diretamente (sem bibliotecas de Excel), o que o torna tolerante
 *   ao filtro automático inválido que a exportação da plataforma gera.
 * - Converte cada linha num serviço + alocação desta app, com IDs estáveis
 *   (reimportar o mesmo dia atualiza em vez de duplicar).
 * - Reconhece motoristas pelo nome (completo, abreviado "P. Lourenço" ou
 *   nomes alternativos já associados) e viaturas pela matrícula.
 * - Não importa dados pessoais de passageiros nem preços.
 */
import { unzipSync, strFromU8 } from 'fflate';
import {
  Driver,
  Vehicle,
  TransportService,
  Allocation,
  ServiceType,
  ServiceStatus,
  VehicleCategory,
  ContractedPackage,
} from '../types';

/* ------------------------------------------------------------------ */
/* 1. Leitura do .xlsx                                                 */
/* ------------------------------------------------------------------ */

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/** Texto de um <si> ou <is> (pode ter vários <r><t>…</t></r>). */
function textOf(fragment: string): string {
  const parts: string[] = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) parts.push(m[1] ? decodeXml(m[1]) : '');
  return parts.join('');
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, '').toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export type SheetRow = Record<string, string>;

/** Lê a primeira folha do Excel e devolve as linhas como objetos (cabeçalho → texto). */
export function readFirstSheet(data: Uint8Array): SheetRow[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new Error('O ficheiro não é um Excel (.xlsx) válido.');
  }

  const shared: string[] = [];
  const sst = files['xl/sharedStrings.xml'];
  if (sst) {
    const xml = strFromU8(sst);
    const re = /<si>([\s\S]*?)<\/si>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) shared.push(textOf(m[1]));
  }

  // Primeira folha: segue workbook.xml + rels; se falhar, usa sheet1.xml
  let sheetPath = 'xl/worksheets/sheet1.xml';
  try {
    const wb = strFromU8(files['xl/workbook.xml']);
    const rels = strFromU8(files['xl/_rels/workbook.xml.rels']);
    const rid = /<sheet\b[^>]*r:id="([^"]+)"/.exec(wb)?.[1];
    const target = rid ? new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1]
      || new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels)?.[1] : undefined;
    if (target) {
      const p = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
      if (files[p]) sheetPath = p;
    }
  } catch {
    /* usa o caminho por defeito */
  }
  const sheetFile = files[sheetPath] || Object.entries(files).find(([k]) => k.startsWith('xl/worksheets/'))?.[1];
  if (!sheetFile) throw new Error('Não encontrei nenhuma folha de dados no ficheiro.');
  const sheet = strFromU8(sheetFile);

  const grid: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(sheet))) {
    const cells: string[] = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    let nextCol = 0;
    while ((cm = cellRe.exec(rm[1]))) {
      const attrs = cm[1];
      const body = cm[2] || '';
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = v !== undefined ? shared[Number(v)] ?? '' : '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else value = v !== undefined ? decodeXml(v) : '';
      cells[col] = value;
    }
    grid.push(cells);
  }
  if (grid.length < 2) return [];

  const headers = grid[0].map(h => (h || '').trim());
  return grid.slice(1)
    .filter(r => r.some(c => c && c.trim() !== ''))
    .map(r => {
      const obj: SheetRow = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = (r[i] ?? '').toString();
      });
      return obj;
    });
}

/* ------------------------------------------------------------------ */
/* 2. Normalização e reconhecimento                                    */
/* ------------------------------------------------------------------ */

export function normalizeName(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePlate(s: string): string {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Matrícula portuguesa no texto da viatura ("Skoda Superb 63-VX-36", "Mercedes EQV AG 73 XS"). */
export function extractPlate(vehicleText: string): string | null {
  const m = /\b([A-Z0-9]{2})[\s-]([A-Z0-9]{2})[\s-]([A-Z0-9]{2})\s*$/i.exec((vehicleText || '').trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}`.toUpperCase() : null;
}

export type DriverMatchMethod = 'nome' | 'abreviado' | 'associado' | 'nenhum';

export function matchDriver(agendaName: string, drivers: Driver[]): { driver?: Driver; method: DriverMatchMethod } {
  const target = normalizeName(agendaName);
  if (!target) return { method: 'nenhum' };

  const byAlias = drivers.find(d => (d.agendaAliases || []).some(a => normalizeName(a) === target));
  if (byAlias) return { driver: byAlias, method: 'associado' };

  const exact = drivers.filter(d => normalizeName(d.name) === target);
  if (exact.length === 1) return { driver: exact[0], method: 'nome' };

  // "P. Lourenço" → inicial do primeiro nome + apelido
  const parts = target.replace(/\./g, ' ').split(' ').filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const candidates = drivers.filter(d => {
      const dp = normalizeName(d.name).replace(/\./g, ' ').split(' ').filter(Boolean);
      if (dp.length < 2) return false;
      const sameLast = dp[dp.length - 1] === last;
      const firstOk = first.length === 1 ? dp[0].startsWith(first) : dp[0] === first;
      return sameLast && firstOk;
    });
    if (candidates.length === 1) return { driver: candidates[0], method: 'abreviado' };
  }

  return { method: 'nenhum' };
}

/* ------------------------------------------------------------------ */
/* 3. Conversão de cada linha                                          */
/* ------------------------------------------------------------------ */

function col(row: SheetRow, ...names: string[]): string {
  for (const n of names) {
    const key = Object.keys(row).find(k => k.trim().toLowerCase() === n.toLowerCase());
    if (key && row[key] !== undefined && String(row[key]).trim() !== '') return String(row[key]).trim();
  }
  return '';
}

/** "02/10/2026" ou número de série do Excel → "2026-10-02" */
function parseDate(raw: string): string | null {
  const s = (raw || '').trim();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** "07:30", "7:30:00" ou fração do Excel → "07:30" */
function parseTime(raw: string): string | null {
  const s = (raw || '').trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  if (/^0?\.\d+$/.test(s)) {
    const mins = Math.round(Number(s) * 1440);
    return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  return null;
}

function addMinutes(dateStr: string, time: string, minutes: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi + minutes));
  return dt.toISOString().slice(0, 16);
}

/** Hora real de fim: se for anterior ao início, passou da meia-noite. */
function endAfter(dateStr: string, start: string, end: string): string {
  const base = `${dateStr}T${end}`;
  return end < start ? addMinutes(dateStr, end, 24 * 60) : base;
}

const STATUS_MAP: Record<string, ServiceStatus> = {
  confirmed: 'CONFIRMADO',
  pending: 'PENDENTE',
  new: 'PENDENTE',
  in_progress: 'EM_CURSO',
  on_site: 'EM_CURSO',
  started: 'EM_CURSO',
  completed: 'CONCLUIDO',
  done: 'CONCLUIDO',
  no_show: 'CONCLUIDO',
  cancelled: 'CANCELADO',
  canceled: 'CANCELADO',
};

export const STATUS_LABEL_PT: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  in_progress: 'Em curso',
  on_site: 'No local',
  completed: 'Concluído',
  no_show: 'No-show',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
};

function shortPlace(address: string): string {
  const s = (address || '').replace(/\s+/g, ' ').trim();
  const idx = s.indexOf(' - ');
  return idx > 0 ? s.slice(0, idx) : s;
}

function vehicleCategory(vehicleType: string, passengers: number): VehicleCategory {
  const t = normalizeName(vehicleType);
  if (/\b(bus|autocarro|coach|midi|mini ?bus|sprinter)\b/.test(t)) return 'PESADOS_PASSAGEIROS';
  if (passengers > 8) return 'PESADOS_PASSAGEIROS';
  return 'LIGEIROS';
}

function seatsFromType(vehicleType: string): number {
  const n = /(\d{1,2})/.exec(vehicleType || '')?.[1];
  if (n) return Number(n);
  const t = normalizeName(vehicleType);
  if (t.includes('sedan')) return 4;
  if (t.includes('van')) return 8;
  return 8;
}

export interface AgendaLine {
  externalId: string;
  rowNumber: number;
  rawStatus: string;
  partner: string;
  driverName: string;
  vehicleText: string;
  vehicleType: string;
  plate: string | null;
  date: string;
  time: string;
  service: TransportService;
  actualStart?: string;
  actualEnd?: string;
  durationMinutes: number;
  /** Linhas de parceiros externos (ex.: outra empresa) — por defeito não entram */
  isExternalPartner: boolean;
}

export interface AgendaParseResult {
  lines: AgendaLine[];
  skipped: { rowNumber: number; reason: string }[];
  dates: string[];
}

/** Parceiros cujos motoristas são da casa ou free-lancers da casa. */
export function isOwnPartner(partner: string): boolean {
  const p = normalizeName(partner);
  return p === '' || p.includes('a4drive') || p.includes('alliance') || p.includes('free lancer') || p.includes('freelancer');
}

export function parseAgendaRows(rows: SheetRow[]): AgendaParseResult {
  const lines: AgendaLine[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const externalId = col(row, 'ID');
    const date = parseDate(col(row, 'Date', 'Data'));
    const time = parseTime(col(row, 'Time', 'Hora'));
    if (!externalId) return skipped.push({ rowNumber, reason: 'sem ID' });
    if (!date || !time) return skipped.push({ rowNumber, reason: 'data ou hora inválida' });

    const rawStatus = col(row, 'Status').toLowerCase();
    const durationMinutes = Math.max(0, Number(col(row, 'Duration').replace(',', '.')) || 0) || 60;
    const passengers = Number(col(row, 'Passengers')) || 0;
    const serviceName = col(row, 'Service');
    const serviceTypeRaw = normalizeName(col(row, 'Service Type'));
    const vehicleText = col(row, 'Vehicle');
    const vehicleType = col(row, 'Vehicle Type');
    const pickup = col(row, 'Pick Up Location Address');
    const dropoff = col(row, 'Drop Off Location Address');
    const flight = col(row, 'Flight');
    const airportPickUp = col(row, 'Airport Pick Up').toUpperCase() === 'TRUE';
    const partner = col(row, 'Partner');

    let type: ServiceType = 'TRANSFER';
    if (/assist|dispos/.test(normalizeName(serviceName))) type = 'DISPOSICAO';
    else if (serviceTypeRaw.includes('tour')) type = durationMinutes >= 360 ? 'TOUR_DIA_INTEIRO' : 'TOUR_MEIO_DIA';

    const isAirport = (s: string) => /aeroporto|airport/i.test(s);
    const transferDirection =
      type === 'TRANSFER' ? (airportPickUp || isAirport(pickup) ? 'CHEGADA' : isAirport(dropoff) ? 'SAIDA' : undefined) : undefined;

    const startTime = parseTime(col(row, 'Start Time'));
    const endTime = parseTime(col(row, 'End Time'));

    const notesParts = [
      'Importado da Agenda A4D',
      serviceName && `Serviço: ${serviceName}`,
      flight && `Voo: ${flight}`,
      vehicleText && `Viatura (agenda): ${vehicleText}`,
      rawStatus && `Estado na agenda: ${STATUS_LABEL_PT[rawStatus] || rawStatus}`,
    ].filter(Boolean);

    const service: TransportService = {
      id: `ag-${externalId}`,
      code: `A4D-${externalId}`,
      type,
      requiredCategory: vehicleCategory(vehicleType, passengers),
      origin: shortPlace(pickup) || '—',
      destination: shortPlace(dropoff) || '—',
      scheduledStart: `${date}T${time}`,
      scheduledEnd: addMinutes(date, time, durationMinutes),
      status: STATUS_MAP[rawStatus] || 'CONFIRMADO',
      passengers,
      // Agência/cliente empresarial — nunca o nome do passageiro
      clientName: col(row, 'Department Name', 'Operator Name') || partner || 'Agenda A4D',
      ...(transferDirection ? { transferDirection } : {}),
      notes: notesParts.join(' • '),
      ...(pickup ? { originAddress: pickup.replace(/\s+/g, ' ').trim() } : {}),
      ...(dropoff ? { destinationAddress: dropoff.replace(/\s+/g, ' ').trim() } : {}),
    };

    lines.push({
      externalId,
      rowNumber,
      rawStatus,
      partner,
      driverName: col(row, 'Driver'),
      vehicleText,
      vehicleType,
      plate: extractPlate(vehicleText),
      date,
      time,
      service,
      actualStart: startTime ? `${date}T${startTime}` : undefined,
      actualEnd: startTime && endTime ? endAfter(date, startTime, endTime) : undefined,
      durationMinutes,
      isExternalPartner: !isOwnPartner(partner),
    });
  });

  const dates = [...new Set(lines.map(l => l.date))].sort();
  return { lines, skipped, dates };
}

/* ------------------------------------------------------------------ */
/* 4. Construção do resultado final                                    */
/* ------------------------------------------------------------------ */

export interface NewDriverRequest {
  agendaName: string;
  regime: Driver['regime'];
  category: Driver['category'];
}

export interface ImportDecisions {
  /** nome na agenda (normalizado) → id do motorista, 'IGNORAR', ou 'CRIAR' */
  driverChoices: Record<string, string>;
  createMissingVehicles: boolean;
  includeExternalPartners: boolean;
}

export interface AgendaImportResult {
  services: TransportService[];
  allocations: Allocation[];
  newDrivers: Driver[];
  newVehicles: Vehicle[];
  /** driverId → nomes da agenda a associar (para reconhecer automaticamente da próxima vez) */
  aliasUpdates: Record<string, string[]>;
  ignoredCount: number;
}

function nextMechanicalNumber(drivers: Driver[], prefix: 'MOT' | 'FL'): (offset: number) => string {
  const max = drivers
    .map(d => new RegExp(`^${prefix}-(\\d+)$`).exec(d.mechanicalNumber || '')?.[1])
    .filter(Boolean)
    .reduce((acc, n) => Math.max(acc, Number(n)), 0);
  return offset => `${prefix}-${String(max + offset).padStart(2, '0')}`;
}

export function buildAgendaImport(
  parsed: AgendaParseResult,
  drivers: Driver[],
  vehicles: Vehicle[],
  decisions: ImportDecisions,
  existingAllocations: Allocation[]
): AgendaImportResult {
  const newDrivers: Driver[] = [];
  const newVehicles: Vehicle[] = [];
  const aliasUpdates: Record<string, string[]> = {};
  const createdByName = new Map<string, Driver>();
  const nextMot = nextMechanicalNumber(drivers, 'MOT');
  const nextFl = nextMechanicalNumber(drivers, 'FL');
  let motOffset = 0;
  let flOffset = 0;
  const stamp = Date.now();

  const resolveDriver = (line: AgendaLine): Driver | 'IGNORAR' | undefined => {
    const key = normalizeName(line.driverName);
    const choice = decisions.driverChoices[key];
    if (choice === 'IGNORAR') return 'IGNORAR';
    if (choice === 'CRIAR') {
      if (!createdByName.has(key)) {
        const regime: Driver['regime'] = normalizeName(line.partner).includes('free') ? 'FREELANCER' : 'ASSALARIADO';
        const d: Driver = {
          id: `d-${stamp}-${createdByName.size + 1}`,
          mechanicalNumber: regime === 'FREELANCER' ? nextFl(++flOffset) : nextMot(++motOffset),
          name: line.driverName.trim(),
          phone: '',
          email: '',
          regime,
          hasScheduleExemption: regime === 'ASSALARIADO',
          category: line.service.requiredCategory === 'PESADOS_PASSAGEIROS' ? 'MISTO_PESADOS' : 'LIGEIROS',
          licenseNumber: '',
          active: true,
        };
        createdByName.set(key, d);
        newDrivers.push(d);
      }
      return createdByName.get(key);
    }
    if (choice) {
      const d = drivers.find(x => x.id === choice);
      if (d) {
        const m = matchDriver(line.driverName, drivers);
        if (m.driver?.id !== d.id) {
          aliasUpdates[d.id] = [...new Set([...(aliasUpdates[d.id] || []), line.driverName.trim()])];
        }
        return d;
      }
    }
    return matchDriver(line.driverName, drivers).driver;
  };

  const vehicleByPlate = new Map(vehicles.map(v => [normalizePlate(v.plate), v]));
  const resolveVehicle = (line: AgendaLine): Vehicle | undefined => {
    if (!line.plate) return undefined;
    const key = normalizePlate(line.plate);
    const found = vehicleByPlate.get(key);
    if (found) return found;
    if (!decisions.createMissingVehicles) return undefined;
    const brandModel = line.vehicleText.replace(/\s*[A-Z0-9]{2}[\s-][A-Z0-9]{2}[\s-][A-Z0-9]{2}\s*$/i, '').trim() || line.vehicleText;
    const v: Vehicle = {
      id: `v-${key.toLowerCase()}`,
      plate: line.plate,
      brandModel,
      category: line.service.requiredCategory,
      seats: seatsFromType(line.vehicleType),
      active: true,
      notes: line.vehicleType ? `Tipo na agenda: ${line.vehicleType}` : undefined,
    };
    vehicleByPlate.set(key, v);
    newVehicles.push(v);
    return v;
  };

  const services: TransportService[] = [];
  const allocations: Allocation[] = [];
  let ignoredCount = 0;

  parsed.lines.forEach(line => {
    if (line.isExternalPartner && !decisions.includeExternalPartners) {
      ignoredCount++;
      return;
    }
    const driver = resolveDriver(line);
    if (driver === 'IGNORAR') {
      ignoredCount++;
      return;
    }
    const vehicle = resolveVehicle(line);
    services.push(line.service);

    if (driver) {
      const allocId = `ag-alloc-${line.externalId}`;
      const previous = existingAllocations.find(a => a.id === allocId);
      const isFreelancer = driver.regime === 'FREELANCER';
      const allocStatus: Allocation['status'] =
        line.service.status === 'CANCELADO' ? 'CANCELADO' : line.service.status === 'CONCLUIDO' ? 'CONCLUIDO' : 'ATRIBUIDO';
      allocations.push({
        id: allocId,
        serviceId: line.service.id,
        driverId: driver.id,
        vehicleId: vehicle?.id || '',
        ...(line.actualStart ? { actualStart: line.actualStart } : {}),
        ...(line.actualEnd ? { actualEnd: line.actualEnd } : {}),
        ...(isFreelancer
          ? { contractedPackage: previous?.contractedPackage || (line.durationMinutes >= 300 ? 'PACOTE_8H' : 'AUTO_MELHOR_TARIFA') as ContractedPackage }
          : {}),
        status: allocStatus,
      });
    }
  });

  return { services, allocations, newDrivers, newVehicles, aliasUpdates, ignoredCount };
}

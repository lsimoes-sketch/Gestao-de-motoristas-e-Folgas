import { TransportService, Allocation, Driver, Vehicle } from '../types';

export interface ParsedServiceRow {
  service: TransportService;
  rawLine: number;
  warnings: string[];
}

export interface ParseResult {
  successList: ParsedServiceRow[];
  errors: { line: number; message: string; rawText?: string }[];
  totalRows: number;
}

/**
 * Normalizes string for header matching (removes accents, lowercase, trims, removes special characters)
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detect delimiter: semicolon, comma, or tab
 */
function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
  if (semicolonCount >= commaCount) return ';';
  return ',';
}

/**
 * Splits a CSV line into cells respecting quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Safely escape CSV cell content
 */
function escapeCSV(val: any, delimiter: string = ';'): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportOptions {
  includeFiscalAddress?: boolean;
}

/**
 * Generate CSV export string for transport services
 */
export function exportServicesToCSV(
  services: TransportService[],
  allocations: Allocation[],
  drivers: Driver[],
  vehicles: Vehicle[],
  delimiter: string = ';',
  options: ExportOptions = { includeFiscalAddress: false }
): string {
  const includeFiscal = !!options.includeFiscalAddress;

  const headers = [
    'Código Serviço',
    'Tipo de Serviço',
    'Cliente',
    'Passageiros',
    'Origem',
    'Destino',
    'Início Previsto',
    'Término Previsto',
    'Duração Estimada (h)',
    'Categoria Exigida',
    'Estado',
    'Motorista Atribuído',
    'Regime Motorista',
    ...(includeFiscal
      ? [
          'NIF Motorista (Fiscalização / Interno)',
          'CC Motorista (Fiscalização / Interno)',
          'Data Nasc. Motorista (Fiscalização / Interno)',
          'Endereço Fiscal (Fiscalização / Interno)',
        ]
      : []),
    'Viatura Atribuída',
    'Matrícula',
    'Observações',
  ];

  const rows = services.map(service => {
    const alloc = allocations.find(a => a.serviceId === service.id);
    const driver = alloc ? drivers.find(d => d.id === alloc.driverId) : null;
    const vehicle = alloc ? vehicles.find(v => v.id === alloc.vehicleId) : null;

    // Calculate duration
    let durationHours = '';
    try {
      const startMs = new Date(service.scheduledStart).getTime();
      const endMs = new Date(service.scheduledEnd).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        durationHours = ((endMs - startMs) / 3600000).toFixed(1);
      }
    } catch {
      durationHours = '';
    }

    const typeLabel =
      service.type === 'TRANSFER'
        ? 'Transfer'
        : service.type === 'TOUR_MEIO_DIA'
        ? 'Tour Meio Dia'
        : service.type === 'TOUR_DIA_INTEIRO'
        ? 'Tour Dia Inteiro'
        : 'Disposição';

    const categoryLabel =
      service.requiredCategory === 'PESADOS_PASSAGEIROS' ? 'Pesados (Passageiros)' : 'Ligeiros';

    const statusLabel =
      service.status === 'CONCLUIDO'
        ? 'Concluído'
        : service.status === 'CONFIRMADO'
        ? 'Confirmado / Alocado'
        : service.status === 'EM_CURSO'
        ? 'Em Curso'
        : service.status === 'CANCELADO'
        ? 'Cancelado'
        : 'Pendente';

    const rowCells = [
      escapeCSV(service.code, delimiter),
      escapeCSV(typeLabel, delimiter),
      escapeCSV(service.clientName || 'Geral', delimiter),
      escapeCSV(service.passengers, delimiter),
      escapeCSV(service.origin, delimiter),
      escapeCSV(service.destination, delimiter),
      escapeCSV(service.scheduledStart.replace('T', ' '), delimiter),
      escapeCSV(service.scheduledEnd.replace('T', ' '), delimiter),
      escapeCSV(durationHours, delimiter),
      escapeCSV(categoryLabel, delimiter),
      escapeCSV(statusLabel, delimiter),
      escapeCSV(driver ? driver.name : 'Sem Motorista', delimiter),
      escapeCSV(driver ? driver.regime : '', delimiter),
    ];

    if (includeFiscal) {
      rowCells.push(
        escapeCSV(driver?.taxNumber || '', delimiter),
        escapeCSV(driver?.citizenCardNumber || '', delimiter),
        escapeCSV(driver?.birthDate || '', delimiter),
        escapeCSV(driver?.fiscalAddress || 'Não registado', delimiter)
      );
    }

    rowCells.push(
      escapeCSV(vehicle ? `${vehicle.brandModel} (${vehicle.plate})` : 'Sem Viatura', delimiter),
      escapeCSV(vehicle ? vehicle.plate : '', delimiter),
      escapeCSV(service.notes || '', delimiter)
    );

    return rowCells.join(delimiter);
  });

  // UTF-8 BOM for Excel Portuguese compatibility
  return '\uFEFF' + [headers.join(delimiter), ...rows].join('\r\n');
}

/**
 * Generate TSV for clipboard copy (paste directly into Excel or Google Sheets)
 */
export function exportServicesToClipboardTSV(
  services: TransportService[],
  allocations: Allocation[],
  drivers: Driver[],
  vehicles: Vehicle[],
  options: ExportOptions = { includeFiscalAddress: false }
): string {
  return exportServicesToCSV(services, allocations, drivers, vehicles, '\t', options).replace(/^\uFEFF/, '');
}

/**
 * Download a string as file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Excel-ready CSV template with explanatory rows
 */
export function generateSampleCSV(delimiter: string = ';'): string {
  const headers = [
    'Codigo',
    'Tipo',
    'Cliente',
    'Passageiros',
    'Origem',
    'Destino',
    'Data Inicio',
    'Hora Inicio',
    'Data Fim',
    'Hora Fim',
    'Categoria',
    'Observacoes',
  ];

  const sampleRows = [
    [
      'SRV-2026-101',
      'TRANSFER',
      'Hotel Ritz Lisbon',
      '3',
      'Aeroporto de Lisboa (LIS)',
      'Four Seasons Hotel Ritz',
      '2026-09-22',
      '09:30',
      '2026-09-22',
      '11:00',
      'LIGEIROS',
      'Voo TP1024 - Cartaz com nome do cliente',
    ],
    [
      'SRV-2026-102',
      'TOUR_DIA_INTEIRO',
      'Agência Abreu Viagens',
      '28',
      'Marquês de Pombal, Lisboa',
      'Sintra, Cabo da Roca e Cascais',
      '2026-09-22',
      '08:30',
      '2026-09-22',
      '17:30',
      'PESADOS',
      'Exige motorista com carta de pesados de passageiros (minibus/autocarro)',
    ],
    [
      'SRV-2026-103',
      'DISPOSICAO',
      'Embaixada Corporativa',
      '6',
      'Avenida da Liberdade',
      'Jantar de Gala & Reuniões Cascais',
      '2026-09-22',
      '18:00',
      '2026-09-22',
      '23:00',
      'LIGEIROS',
      'Disposição noturna com período de jantar',
    ],
  ];

  const content = [
    headers.join(delimiter),
    ...sampleRows.map(r => r.map(c => escapeCSV(c, delimiter)).join(delimiter)),
  ].join('\r\n');

  return '\uFEFF' + content;
}

/**
 * Normalizes input date and time to ISO format (YYYY-MM-DDTHH:mm)
 */
function parseDateTime(dateStr?: string, timeStr?: string): string | null {
  if (!dateStr) return null;

  let cleanedDate = dateStr.trim();
  let cleanedTime = timeStr ? timeStr.trim() : '';

  // Check if dateStr already contains 'T' or space with time
  if (cleanedDate.includes('T')) {
    const parts = cleanedDate.split('T');
    cleanedDate = parts[0];
    cleanedTime = cleanedTime || parts[1];
  } else if (cleanedDate.includes(' ')) {
    const parts = cleanedDate.split(/\s+/);
    cleanedDate = parts[0];
    cleanedTime = cleanedTime || parts[1];
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY format
  if (cleanedDate.includes('/')) {
    const parts = cleanedDate.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        cleanedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        cleanedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  } else if (cleanedDate.includes('-')) {
    const parts = cleanedDate.split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      cleanedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  // Normalize time
  if (!cleanedTime) {
    cleanedTime = '09:00';
  } else {
    // Keep only HH:mm
    const timeParts = cleanedTime.split(':');
    const h = (timeParts[0] || '0').padStart(2, '0');
    const m = (timeParts[1] || '0').padStart(2, '0');
    cleanedTime = `${h}:${m}`;
  }

  // Validate format
  const isoStr = `${cleanedDate}T${cleanedTime}`;
  const timestamp = new Date(isoStr).getTime();
  if (isNaN(timestamp)) {
    return null;
  }

  return isoStr;
}

/**
 * Parses raw CSV or Tab-delimited text into TransportService objects
 */
export function parseServicesFromCSV(csvText: string): ParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return { successList: [], errors: [{ line: 0, message: 'O ficheiro/conteúdo está vazio.' }], totalRows: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = parseCSVLine(lines[0], delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Map common header variations to standard keys
  const headerMap: Record<string, number> = {};

  normalizedHeaders.forEach((h, idx) => {
    if (h.includes('cod') || h === 'ref' || h === 'id' || h === 'servico') headerMap.code = idx;
    else if (h.includes('tipo') || h === 'type') headerMap.type = idx;
    else if (h.includes('client') || h === 'empresa' || h === 'passageiro') headerMap.client = idx;
    else if (h.includes('pax') || h.includes('passag') || h.includes('lugares') || h === 'qtd') headerMap.passengers = idx;
    else if (h.includes('origem') || h.includes('pickup') || h === 'de' || h === 'from') headerMap.origin = idx;
    else if (h.includes('destin') || h.includes('dropoff') || h === 'para' || h === 'to') headerMap.destination = idx;
    else if (h.includes('datainicio') || h === 'data' || h === 'dia' || h.includes('startdate')) headerMap.startDate = idx;
    else if (h.includes('horainicio') || h === 'hora' || h.includes('starttime')) headerMap.startTime = idx;
    else if (h.includes('datafim') || h.includes('datatermino') || h.includes('enddate')) headerMap.endDate = idx;
    else if (h.includes('horafim') || h.includes('horatermino') || h.includes('endtime')) headerMap.endTime = idx;
    else if (h.includes('inicio') || h.includes('start')) headerMap.scheduledStart = idx;
    else if (h.includes('fim') || h.includes('termino') || h.includes('end')) headerMap.scheduledEnd = idx;
    else if (h.includes('categ') || h.includes('veiculo') || h.includes('viatura') || h.includes('pesad')) headerMap.category = idx;
    else if (h.includes('obs') || h.includes('nota') || h.includes('coment') || h.includes('desc')) headerMap.notes = idx;
  });

  const successList: ParsedServiceRow[] = [];
  const errors: { line: number; message: string; rawText?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = parseCSVLine(rawLine, delimiter);

    // Skip empty lines
    if (cells.length === 0 || cells.every(c => c === '')) continue;

    const warnings: string[] = [];

    const getCell = (key: string): string => {
      const idx = headerMap[key];
      return idx !== undefined && cells[idx] !== undefined ? cells[idx] : '';
    };

    // Code
    let code = getCell('code');
    if (!code) {
      code = `SRV-IMP-${Date.now().toString().slice(-4)}${i}`;
      warnings.push('Código gerado automaticamente.');
    }

    // Type
    const rawType = getCell('type').toLowerCase();
    let serviceType: TransportService['type'] = 'TRANSFER';
    if (rawType.includes('dia') && (rawType.includes('inteiro') || rawType.includes('full'))) {
      serviceType = 'TOUR_DIA_INTEIRO';
    } else if (rawType.includes('meio') || rawType.includes('half')) {
      serviceType = 'TOUR_MEIO_DIA';
    } else if (rawType.includes('disp') || rawType.includes('hourly') || rawType.includes('horas')) {
      serviceType = 'DISPOSICAO';
    } else if (rawType.includes('tour')) {
      serviceType = 'TOUR_MEIO_DIA';
    } else {
      serviceType = 'TRANSFER';
    }

    // Origin and Destination
    const origin = getCell('origin') || 'Origem a definir';
    const destination = getCell('destination') || 'Destino a definir';

    if (!getCell('origin')) warnings.push('Origem não especificada (assumida por defeito).');
    if (!getCell('destination')) warnings.push('Destino não especificado (assumido por defeito).');

    // Passengers
    const rawPax = parseInt(getCell('passengers'), 10);
    const passengers = !isNaN(rawPax) && rawPax > 0 ? rawPax : 1;

    // Required Category
    const rawCat = (getCell('category') || '').toLowerCase();
    let requiredCategory: 'LIGEIROS' | 'PESADOS_PASSAGEIROS' = 'LIGEIROS';
    if (
      rawCat.includes('pesad') ||
      rawCat.includes('misto') ||
      rawCat.includes('autocarro') ||
      rawCat.includes('bus') ||
      rawCat.includes('mini') ||
      passengers > 8
    ) {
      requiredCategory = 'PESADOS_PASSAGEIROS';
      if (passengers > 8 && !rawCat.includes('pesad')) {
        warnings.push('Veículo Pesado exigido devido a lotação superior a 8 passageiros.');
      }
    }

    // Dates & Times
    let scheduledStart = getCell('scheduledStart');
    let scheduledEnd = getCell('scheduledEnd');

    if (!scheduledStart) {
      const sDate = getCell('startDate');
      const sTime = getCell('startTime');
      scheduledStart = parseDateTime(sDate, sTime) || '';
    } else {
      scheduledStart = parseDateTime(scheduledStart) || '';
    }

    if (!scheduledEnd) {
      const eDate = getCell('endDate') || getCell('startDate');
      const eTime = getCell('endTime');
      scheduledEnd = parseDateTime(eDate, eTime) || '';
    } else {
      scheduledEnd = parseDateTime(scheduledEnd) || '';
    }

    // If still missing start, default to tomorrow 09:00
    if (!scheduledStart) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      scheduledStart = `${dateStr}T09:00`;
      warnings.push('Data de início inválida/ausente: definida para amanhã às 09:00.');
    }

    // If missing end or end <= start, calculate duration by service type
    if (!scheduledEnd || new Date(scheduledEnd) <= new Date(scheduledStart)) {
      const startObj = new Date(scheduledStart);
      const durationHours =
        serviceType === 'TOUR_DIA_INTEIRO' ? 8 : serviceType === 'TOUR_MEIO_DIA' ? 4 : serviceType === 'DISPOSICAO' ? 4 : 2;
      startObj.setHours(startObj.getHours() + durationHours);
      const y = startObj.getFullYear();
      const m = String(startObj.getMonth() + 1).padStart(2, '0');
      const d = String(startObj.getDate()).padStart(2, '0');
      const hh = String(startObj.getHours()).padStart(2, '0');
      const mm = String(startObj.getMinutes()).padStart(2, '0');
      scheduledEnd = `${y}-${m}-${d}T${hh}:${mm}`;
      warnings.push(`Término estimado automaticamente (+${durationHours}h).`);
    }

    const clientName = getCell('client') || 'Cliente Geral';
    const notes = getCell('notes');

    const service: TransportService = {
      id: `srv-imp-${Date.now()}-${i}`,
      code,
      type: serviceType,
      requiredCategory,
      origin,
      destination,
      scheduledStart,
      scheduledEnd,
      status: 'PENDENTE',
      passengers,
      clientName,
      notes: notes || (warnings.length > 0 ? `Importado: ${warnings.join(' ')}` : undefined),
    };

    successList.push({
      service,
      rawLine: i + 1,
      warnings,
    });
  }

  return {
    successList,
    errors,
    totalRows: lines.length - 1,
  };
}

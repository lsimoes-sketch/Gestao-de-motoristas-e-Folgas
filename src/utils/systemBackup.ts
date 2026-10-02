import {
  Driver,
  Vehicle,
  TransportService,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
  FreelancerSettlement,
} from '../types';

export interface SystemBackupData {
  version: string;
  exportedAt: string;
  system: string;
  counts: {
    drivers: number;
    vehicles: number;
    services: number;
    allocations: number;
    shiftScales: number;
    dayOffs: number;
    settlements: number;
  };
  drivers: Driver[];
  vehicles: Vehicle[];
  services: TransportService[];
  allocations: Allocation[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  settlements: FreelancerSettlement[];
}

export interface CSVExportOptions {
  delimiter?: ';' | ',' | '\t';
  includeFiscalDetails?: boolean;
}

/**
 * Escapes a cell value for standard CSV compatibility
 */
export function escapeCSV(val: any, delimiter: string = ';'): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'application/json;charset=utf-8;'
): void {
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
 * Creates a complete JSON backup snapshot of all system data
 */
export function generateSystemBackupJSON(
  data: {
    drivers: Driver[];
    vehicles: Vehicle[];
    services: TransportService[];
    allocations: Allocation[];
    shiftScales: ShiftScaleConfig[];
    dayOffs: DayOffRecord[];
    settlements: FreelancerSettlement[];
  },
  pretty: boolean = true
): string {
  const backup: SystemBackupData = {
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    system: 'Transfers & Tours Ops - Gestão de Motoristas, Frotas e Escalas',
    counts: {
      drivers: data.drivers.length,
      vehicles: data.vehicles.length,
      services: data.services.length,
      allocations: data.allocations.length,
      shiftScales: data.shiftScales.length,
      dayOffs: data.dayOffs.length,
      settlements: data.settlements.length,
    },
    drivers: data.drivers,
    vehicles: data.vehicles,
    services: data.services,
    allocations: data.allocations,
    shiftScales: data.shiftScales,
    dayOffs: data.dayOffs,
    settlements: data.settlements,
  };

  return pretty ? JSON.stringify(backup, null, 2) : JSON.stringify(backup);
}

/**
 * Validates and parses a JSON backup file content
 */
export function validateAndParseBackupJSON(jsonStr: string): {
  valid: boolean;
  data?: SystemBackupData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Ficheiro JSON inválido ou vazio.' };
    }

    if (!Array.isArray(parsed.drivers) || !Array.isArray(parsed.vehicles) || !Array.isArray(parsed.services)) {
      return {
        valid: false,
        error: 'O ficheiro de cópia de segurança não contém as coleções obrigatórias (motoristas, veículos ou serviços).',
      };
    }

    const data: SystemBackupData = {
      version: parsed.version || '1.0.0',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      system: parsed.system || 'Transfers & Tours Ops',
      counts: {
        drivers: parsed.drivers.length,
        vehicles: parsed.vehicles.length,
        services: parsed.services.length,
        allocations: Array.isArray(parsed.allocations) ? parsed.allocations.length : 0,
        shiftScales: Array.isArray(parsed.shiftScales) ? parsed.shiftScales.length : 0,
        dayOffs: Array.isArray(parsed.dayOffs) ? parsed.dayOffs.length : 0,
        settlements: Array.isArray(parsed.settlements) ? parsed.settlements.length : 0,
      },
      drivers: parsed.drivers,
      vehicles: parsed.vehicles,
      services: parsed.services,
      allocations: Array.isArray(parsed.allocations) ? parsed.allocations : [],
      shiftScales: Array.isArray(parsed.shiftScales) ? parsed.shiftScales : [],
      dayOffs: Array.isArray(parsed.dayOffs) ? parsed.dayOffs : [],
      settlements: Array.isArray(parsed.settlements) ? parsed.settlements : [],
    };

    return { valid: true, data };
  } catch (err: any) {
    return {
      valid: false,
      error: `Erro ao processar ficheiro JSON: ${err?.message || 'Formato incorreto'}`,
    };
  }
}

/**
 * Exports Drivers table to CSV format
 */
export function exportDriversToCSV(
  drivers: Driver[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';
  const includeFiscal = options.includeFiscalDetails ?? true;

  const headers = [
    'ID',
    'Nº Mecanográfico',
    'Nome Completo',
    'Regime',
    'Isenção de Horário (IHT)',
    'Habilitação Veículo',
    'Carta de Condução',
    'Validade CAM',
    'Telemóvel',
    'Email',
    'Estado',
    ...(includeFiscal
      ? [
          'NIF (Fiscalização)',
          'Cartão de Cidadão (Fiscalização)',
          'Data de Nascimento (Fiscalização)',
          'Morada Fiscal (Fiscalização)',
        ]
      : []),
  ];

  const rows = drivers.map(d => {
    const cells = [
      escapeCSV(d.id, delimiter),
      escapeCSV(d.mechanicalNumber, delimiter),
      escapeCSV(d.name, delimiter),
      escapeCSV(d.regime === 'ASSALARIADO' ? 'Assalariado (IHT)' : 'Free-lancer', delimiter),
      escapeCSV(d.hasScheduleExemption ? 'SIM' : 'NÃO', delimiter),
      escapeCSV(d.category === 'MISTO_PESADOS' ? 'Ligeiros + Pesados' : 'Apenas Ligeiros', delimiter),
      escapeCSV(d.licenseNumber, delimiter),
      escapeCSV(d.camExpiryDate || 'N/A', delimiter),
      escapeCSV(d.phone, delimiter),
      escapeCSV(d.email, delimiter),
      escapeCSV(d.active ? 'ATIVO' : 'INATIVO', delimiter),
    ];

    if (includeFiscal) {
      cells.push(
        escapeCSV(d.taxNumber || '', delimiter),
        escapeCSV(d.citizenCardNumber || '', delimiter),
        escapeCSV(d.birthDate || '', delimiter),
        escapeCSV(d.fiscalAddress || '', delimiter)
      );
    }

    return cells.join(delimiter);
  });

  return '\uFEFF' + [headers.join(delimiter), ...rows].join('\r\n');
}

/**
 * Exports Vehicles table to CSV format
 */
export function exportVehiclesToCSV(
  vehicles: Vehicle[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';

  const headers = [
    'ID',
    'Matrícula',
    'Marca e Modelo',
    'Categoria',
    'Lotação (Lugares)',
    'Estado Operacional',
  ];

  const rows = vehicles.map(v => {
    const cells = [
      escapeCSV(v.id, delimiter),
      escapeCSV(v.plate, delimiter),
      escapeCSV(v.brandModel, delimiter),
      escapeCSV(v.category === 'PESADOS_PASSAGEIROS' ? 'Pesado de Passageiros' : 'Ligeiro', delimiter),
      escapeCSV(v.seats, delimiter),
      escapeCSV(v.active ? 'ATIVO' : 'INATIVO', delimiter),
    ];

    return cells.join(delimiter);
  });

  return '\uFEFF' + [headers.join(delimiter), ...rows].join('\r\n');
}

/**
 * Exports Services & Allocations to CSV format
 */
export function exportServicesAndAllocationsToCSV(
  services: TransportService[],
  allocations: Allocation[],
  drivers: Driver[],
  vehicles: Vehicle[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';
  const includeFiscal = options.includeFiscalDetails ?? false;

  const headers = [
    'Código Serviço',
    'Tipo de Serviço',
    'Cliente',
    'Nº Passageiros',
    'Local de Origem',
    'Local de Destino',
    'Início Previsto',
    'Término Previsto',
    'Duração Estimada (h)',
    'Categoria Exigida',
    'Estado Serviço',
    'Motorista Atribuído',
    'Nº Mecanográfico Motorista',
    'Regime Motorista',
    ...(includeFiscal
      ? [
          'NIF Motorista (Fiscalização)',
          'CC Motorista (Fiscalização)',
          'Data Nasc. Motorista (Fiscalização)',
          'Morada Fiscal (Fiscalização)',
        ]
      : []),
    'Viatura Atribuída',
    'Matrícula',
    'Observações',
  ];

  const rows = services.map(s => {
    const alloc = allocations.find(a => a.serviceId === s.id);
    const driver = alloc ? drivers.find(d => d.id === alloc.driverId) : undefined;
    const vehicle = alloc ? vehicles.find(v => v.id === alloc.vehicleId) : undefined;

    const start = new Date(s.scheduledStart);
    const end = new Date(s.scheduledEnd);
    const durationHours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);

    const cells = [
      escapeCSV(s.code, delimiter),
      escapeCSV(s.type, delimiter),
      escapeCSV(s.clientName, delimiter),
      escapeCSV(s.passengers, delimiter),
      escapeCSV(s.origin, delimiter),
      escapeCSV(s.destination, delimiter),
      escapeCSV(s.scheduledStart.replace('T', ' '), delimiter),
      escapeCSV(s.scheduledEnd.replace('T', ' '), delimiter),
      escapeCSV(durationHours, delimiter),
      escapeCSV(s.requiredCategory === 'PESADOS_PASSAGEIROS' ? 'Pesados de Passageiros' : 'Ligeiros', delimiter),
      escapeCSV(s.status, delimiter),
      escapeCSV(driver ? driver.name : 'Não Atribuído', delimiter),
      escapeCSV(driver ? driver.mechanicalNumber : '', delimiter),
      escapeCSV(driver ? (driver.regime === 'ASSALARIADO' ? 'Assalariado (IHT)' : 'Free-lancer') : '', delimiter),
    ];

    if (includeFiscal) {
      cells.push(
        escapeCSV(driver?.taxNumber || '', delimiter),
        escapeCSV(driver?.citizenCardNumber || '', delimiter),
        escapeCSV(driver?.birthDate || '', delimiter),
        escapeCSV(driver?.fiscalAddress || '', delimiter)
      );
    }

    cells.push(
      escapeCSV(vehicle ? vehicle.brandModel : 'Não Atribuída', delimiter),
      escapeCSV(vehicle ? vehicle.plate : '', delimiter),
      escapeCSV(s.notes || '', delimiter)
    );

    return cells.join(delimiter);
  });

  return '\uFEFF' + [headers.join(delimiter), ...rows].join('\r\n');
}

/**
 * Exports Shift Scales & Day Offs to CSV format
 */
export function exportRosterToCSV(
  shiftScales: ShiftScaleConfig[],
  dayOffs: DayOffRecord[],
  drivers: Driver[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';

  const headers = [
    'ID Registo',
    'Motorista',
    'Nº Mecanográfico',
    'Data Folga / Ausência',
    'Tipo Ausência',
    'Bloqueado para Escala',
    'Origem (Automático/Manual)',
    'Observações / Notas',
  ];

  const rows = dayOffs.map(d => {
    const driver = drivers.find(dr => dr.id === d.driverId);
    const cells = [
      escapeCSV(d.id, delimiter),
      escapeCSV(driver ? driver.name : 'Desconhecido', delimiter),
      escapeCSV(driver ? driver.mechanicalNumber : '', delimiter),
      escapeCSV(d.date, delimiter),
      escapeCSV(d.type, delimiter),
      escapeCSV(d.blocked ? 'SIM' : 'NÃO', delimiter),
      escapeCSV(d.isAutomatic ? 'Automático (Regra de Escala)' : 'Manual (Ajuste Gestor)', delimiter),
      escapeCSV(d.notes || '', delimiter),
    ];
    return cells.join(delimiter);
  });

  return '\uFEFF' + [headers.join(delimiter), ...rows].join('\r\n');
}

/**
 * Exports Freelancer Settlements to CSV format
 */
export function exportSettlementsToCSV(
  settlements: FreelancerSettlement[],
  allocations: Allocation[],
  services: TransportService[],
  drivers: Driver[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';

  const headers = [
    'ID Liquidação',
    'Código Serviço',
    'Motorista Free-lancer',
    'Nº Mecanográfico',
    'Início Efetivo',
    'Término Efetivo',
    'Duração Real (h)',
    'Pacotes Aplicados',
    'Horas Suplementares',
    'Subsídio Refeição',
    'Justificação Refeição',
    'Total a Liquidar (€)',
    'Data de Fecho',
  ];

  const rows = settlements.map(st => {
    const alloc = allocations.find(a => a.id === st.allocationId);
    const service = alloc ? services.find(s => s.id === alloc.serviceId) : undefined;
    const driver =
      drivers.find(d => d.id === st.driverId) ||
      (alloc ? drivers.find(d => d.id === alloc.driverId) : undefined);

    const packages = [
      st.package4h > 0 ? `${st.package4h}x 4h` : '',
      st.package8h > 0 ? `${st.package8h}x 8h` : '',
    ]
      .filter(Boolean)
      .join(' + ') || 'Tarifa Padrão';

    const cells = [
      escapeCSV(st.id, delimiter),
      escapeCSV(st.serviceCode || (service ? service.code : 'N/A'), delimiter),
      escapeCSV(driver ? driver.name : st.driverName || 'Free-lancer', delimiter),
      escapeCSV(driver ? driver.mechanicalNumber : '', delimiter),
      escapeCSV(st.actualStart ? st.actualStart.replace('T', ' ') : '', delimiter),
      escapeCSV(st.actualEnd ? st.actualEnd.replace('T', ' ') : '', delimiter),
      escapeCSV(st.durationHours, delimiter),
      escapeCSV(packages, delimiter),
      escapeCSV(st.overtimeHours, delimiter),
      escapeCSV(st.mealGranted ? 'SIM (15.00€)' : 'NÃO', delimiter),
      escapeCSV(st.mealReason || '', delimiter),
      escapeCSV(st.totalAmount.toFixed(2), delimiter),
      escapeCSV(st.closedAt ? st.closedAt.replace('T', ' ') : '', delimiter),
    ];

    return cells.join(delimiter);
  });

  return '\uFEFF' + [headers.join(delimiter), ...rows].join('\r\n');
}

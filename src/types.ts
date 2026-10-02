export type DriverRegime = 'ASSALARIADO' | 'FREELANCER';
export type DriverCategory = 'LIGEIROS' | 'MISTO_PESADOS';

export interface Driver {
  id: string;
  mechanicalNumber: string;
  name: string;
  phone: string;
  email: string;
  // Campos para uso interno e fiscalização (preenchimento opcional)
  birthDate?: string; // Data de nascimento (AAAA-MM-DD)
  citizenCardNumber?: string; // Número de Cartão de Cidadão (CC)
  taxNumber?: string; // Número de Identificação Fiscal (NIF)
  fiscalAddress?: string; // Endereço fiscal para faturação/recibos/processamento/fiscalização
  regime: DriverRegime;
  hasScheduleExemption: boolean; // IHT (Isenção de Horário de Trabalho)
  category: DriverCategory;
  licenseNumber: string;
  camExpiryDate?: string; // CAM date if MISTO_PESADOS
  active: boolean;
}

export type VehicleCategory = 'LIGEIROS' | 'PESADOS_PASSAGEIROS';

export interface Vehicle {
  id: string;
  plate: string;
  brandModel: string;
  category: VehicleCategory;
  seats: number;
  active: boolean;
  year?: number;
  inspectionExpiry?: string;
  notes?: string;
}

export type ServiceType = 'TRANSFER' | 'TOUR_MEIO_DIA' | 'TOUR_DIA_INTEIRO' | 'DISPOSICAO';
export type ServiceStatus = 'PENDENTE' | 'CONFIRMADO' | 'EM_CURSO' | 'CONCLUIDO' | 'CANCELADO';

export type AirportTransferDirection = 'CHEGADA' | 'SAIDA';

export interface TransportService {
  id: string;
  code: string;
  type: ServiceType;
  requiredCategory: VehicleCategory;
  origin: string;
  destination: string;
  scheduledStart: string; // ISO string or YYYY-MM-DDTHH:mm
  scheduledEnd: string;
  status: ServiceStatus;
  passengers: number;
  clientName: string;
  transferDirection?: AirportTransferDirection; // Opcional: Chegada ou Saída de Aeroporto
  notes?: string;
}

export type ContractedPackage = 'PACOTE_4H' | 'PACOTE_8H' | 'AUTO_MELHOR_TARIFA';

export interface Allocation {
  id: string;
  serviceId: string;
  driverId: string;
  vehicleId: string;
  actualStart?: string;
  actualEnd?: string;
  contractedPackage?: ContractedPackage;
  status: 'ATRIBUIDO' | 'CONCLUIDO' | 'CANCELADO';
}

export interface FreelancerCalculationResult {
  durationMinutes: number;
  durationHours: number;
  package4h: number;
  package8h: number;
  overtimeHours: number;
  mealGranted: boolean;
  mealReason: string;
  mealMode: 'AUTO' | 'MANUAL';
  baseCost: number;
  overtimeCost: number;
  mealCost: number;
  totalCost: number;
}

export interface FreelancerSettlement {
  id: string;
  allocationId: string;
  serviceCode: string;
  driverId: string;
  driverName: string;
  actualStart: string;
  actualEnd: string;
  durationHours: number;
  package4h: number;
  package8h: number;
  overtimeHours: number;
  mealGranted: boolean;
  mealReason: string;
  mealMode?: 'AUTO' | 'MANUAL';
  totalAmount: number;
  closedAt: string;
}

export type DayOffType = 'FOLGA_ROTATIVA' | 'FERIAS' | 'BAIXA_MEDICA' | 'COMPENSACAO';

export interface DayOffRecord {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  type: DayOffType;
  isAutomatic: boolean;
  blocked: boolean;
  notes?: string;
}

export type ShiftCycleType = 'MENSAL_FDS_ALTERNADO' | '6x2' | '5x2' | '4x2';
export type WeekendOffPattern = 'SEMANAS_IMPARES' | 'SEMANAS_PARES';

export interface ShiftScaleConfig {
  id: string;
  driverId: string;
  cycleType: ShiftCycleType;
  anchorDate: string; // YYYY-MM-DD
  workDays: number;
  offDays: number;
  weekendOffPattern?: WeekendOffPattern;
  weekdayOffDays?: [number, number]; // Dias de folga na semana em que trabalha ao FDS (ex: [2, 3] = Terça e Quarta)
}

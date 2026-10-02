import {
  Driver,
  Vehicle,
  TransportService,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
} from '../types';
import { getDriverDayStatus, checkDriverQualification, getAllDriverServiceOverlaps } from './rulesEngine';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AlertType =
  | 'DAYOFF_SERVICE_CONFLICT'
  | 'UNASSIGNED_SERVICE'
  | 'MISSING_SHIFT_SCALE'
  | 'CATEGORY_MISMATCH'
  | 'SERVICE_OVERLAP_CONFLICT';

export interface OperationalAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  date: string;
  serviceId?: string;
  serviceCode?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  requiredCategory?: string;
  dayOffType?: string;
  dayOffLabel?: string;
  isToday: boolean;
  isTomorrow: boolean;
  suggestedAction: {
    label: string;
    tabTarget: 'services' | 'roster' | 'drivers-fleet';
    serviceToAllocate?: TransportService;
  };
}

export interface OperationalAlertsSummary {
  alerts: OperationalAlert[];
  criticalCount: number;
  unassignedCount: number;
  dayOffConflictCount: number;
  serviceOverlapConflictCount: number;
  missingScaleCount: number;
  hasImmediateActionRequired: boolean;
  urgentCount: number;
  todayCount: number;
  todayConflictCount: number;
  todayUnassignedCount: number;
}

/**
 * Computes all operational alerts regarding:
 * 1. Unfilled shift scales & unassigned services (scales not filled)
 * 2. Days off / vacations / leaves coinciding with active scheduled services
 * 3. Salaried drivers without an active shift rotation scale
 * 4. Driver qualification mismatches
 */
export function getOperationalAlerts(
  services: TransportService[],
  allocations: Allocation[],
  drivers: Driver[],
  vehicles: Vehicle[],
  shiftScales: ShiftScaleConfig[],
  dayOffs: DayOffRecord[],
  currentDateStr: string = '2026-09-12'
): OperationalAlertsSummary {
  const alerts: OperationalAlert[] = [];

  const today = currentDateStr;
  const tomorrowDate = new Date(currentDateStr + 'T00:00:00');
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  // 1. Check services for DAY OFF CONFLICTS and QUALIFICATION MISMATCHES
  services.forEach(service => {
    const serviceDate = service.scheduledStart.split('T')[0];
    const isToday = serviceDate === today;
    const isTomorrow = serviceDate === tomorrow;
    const alloc = allocations.find(a => a.serviceId === service.id);

    if (alloc && alloc.driverId) {
      const driver = drivers.find(d => d.id === alloc.driverId);
      const vehicle = alloc.vehicleId ? vehicles.find(v => v.id === alloc.vehicleId) : undefined;

      if (driver) {
        // Check Day Off Coincidence (Crucial Requirement)
        // Checks salaried rotation scale as well as manual day offs (vacations, sick leaves, compensations)
        const dayStatus = getDriverDayStatus(driver.id, serviceDate, dayOffs, shiftScales);

        if (dayStatus.isDayOff) {
          const formattedTime = `${service.scheduledStart.split('T')[1]} - ${service.scheduledEnd.split('T')[1]}`;
          alerts.push({
            id: `alert-dayoff-${service.id}-${driver.id}`,
            type: 'DAYOFF_SERVICE_CONFLICT',
            severity: 'CRITICAL',
            title: `Folga Coincide com Serviço Ativo: ${driver.name}`,
            description: `O motorista ${driver.name} (${driver.mechanicalNumber}) está alocado ao serviço ativo ${service.code} (${service.origin} → ${service.destination}, ${formattedTime}), mas encontra-se em regime de "${dayStatus.label}" na data de ${serviceDate}.`,
            date: serviceDate,
            serviceId: service.id,
            serviceCode: service.code,
            driverId: driver.id,
            driverName: driver.name,
            vehicleId: vehicle?.id,
            vehiclePlate: vehicle?.plate,
            dayOffType: dayStatus.type,
            dayOffLabel: dayStatus.label,
            isToday,
            isTomorrow,
            suggestedAction: {
              label: 'Reatribuir Motorista',
              tabTarget: 'services',
              serviceToAllocate: service,
            },
          });
        }

        // Check Category Mismatch
        const qual = checkDriverQualification(driver, service);
        if (!qual.allowed) {
          alerts.push({
            id: `alert-qual-${service.id}-${driver.id}`,
            type: 'CATEGORY_MISMATCH',
            severity: 'CRITICAL',
            title: `Incompatibilidade de Categoria: ${service.code}`,
            description: `O serviço exige transporte em ${service.requiredCategory === 'PESADOS_PASSAGEIROS' ? 'Pesados de Passageiros (Autocarro/Mini-bus)' : 'Ligeiros'}, mas o motorista ${driver.name} só possui habilitação para Ligeiros (Carta B sem CAM).`,
            date: serviceDate,
            serviceId: service.id,
            serviceCode: service.code,
            driverId: driver.id,
            driverName: driver.name,
            vehicleId: vehicle?.id,
            vehiclePlate: vehicle?.plate,
            requiredCategory: service.requiredCategory,
            isToday,
            isTomorrow,
            suggestedAction: {
              label: 'Substituir por Motorista CAM',
              tabTarget: 'services',
              serviceToAllocate: service,
            },
          });
        }
      }
    }

    // 2. Check for UNFILLED / UNASSIGNED SCALES (Services without Driver or Vehicle)
    const isUnassigned =
      !alloc ||
      !alloc.driverId ||
      !alloc.vehicleId ||
      service.status === 'PENDENTE';

    if (isUnassigned) {
      const missingParts: string[] = [];
      if (!alloc || !alloc.driverId) missingParts.push('Motorista');
      if (!alloc || !alloc.vehicleId) missingParts.push('Viatura');

      const severity: AlertSeverity = isToday ? 'CRITICAL' : isTomorrow ? 'WARNING' : 'INFO';
      const timeLabel = isToday
        ? 'HOJE'
        : isTomorrow
        ? 'AMANHÃ'
        : `a ${serviceDate.split('-').reverse().join('/')}`;

      const missingText =
        missingParts.length === 2
          ? 'sem motorista nem viatura atribuídos'
          : `sem ${missingParts[0]} atribuído`;

      alerts.push({
        id: `alert-unassigned-${service.id}`,
        type: 'UNASSIGNED_SERVICE',
        severity,
        title: `Escala Não Preenchida: ${service.code} (${timeLabel})`,
        description: `O serviço "${service.type}" para o cliente "${service.clientName}" (${service.passengers} passageiros, ${service.origin} → ${service.destination}) está ${missingText} para as ${service.scheduledStart.split('T')[1]}.`,
        date: serviceDate,
        serviceId: service.id,
        serviceCode: service.code,
        requiredCategory: service.requiredCategory,
        isToday,
        isTomorrow,
        suggestedAction: {
          label: 'Preencher Escala / Alocar',
          tabTarget: 'services',
          serviceToAllocate: service,
        },
      });
    }
  });

  // 3. Check for SALARIED DRIVERS WITHOUT SHIFT SCALE CONFIGURATION
  const salariedDrivers = drivers.filter(d => d.regime === 'ASSALARIADO' && d.active);
  salariedDrivers.forEach(driver => {
    const hasScale = shiftScales.some(s => s.driverId === driver.id);
    if (!hasScale) {
      alerts.push({
        id: `alert-missing-scale-${driver.id}`,
        type: 'MISSING_SHIFT_SCALE',
        severity: 'WARNING',
        title: `Escala Rotativa em Falta: ${driver.name}`,
        description: `O motorista assalariado ${driver.name} (${driver.mechanicalNumber}) não possui padrão de escala de rotação ou folgas alternadas configurado no sistema.`,
        date: today,
        driverId: driver.id,
        driverName: driver.name,
        isToday: true,
        isTomorrow: false,
        suggestedAction: {
          label: 'Configurar Escala no Mapa',
          tabTarget: 'roster',
        },
      });
    }
  });

  // 4. Check for DRIVER SERVICE OVERLAP CONFLICTS (Não sobreposição de serviços)
  // Regra de Integridade: O motorista só pode ter sobreposição se for uma Chegada e uma Saída
  // de e para o Aeroporto, e a Saída não ultrapassar 30 min para lá da Chegada.
  const overlapReports = getAllDriverServiceOverlaps(services, allocations, drivers);
  overlapReports.forEach(report => {
    if (!report.isAllowed) {
      const isToday = report.date === today;
      const isTomorrow = report.date === tomorrow;

      alerts.push({
        id: report.id,
        type: 'SERVICE_OVERLAP_CONFLICT',
        severity: 'CRITICAL',
        title: `Sobreposição Não Permitida: ${report.driverName} (${report.serviceA.code} & ${report.serviceB.code})`,
        description: report.validation.reason,
        date: report.date,
        serviceId: report.serviceA.id,
        serviceCode: report.serviceA.code,
        driverId: report.driverId,
        driverName: report.driverName,
        isToday,
        isTomorrow,
        suggestedAction: {
          label: 'Resolver Sobreposição',
          tabTarget: 'services',
          serviceToAllocate: report.serviceB,
        },
      });
    }
  });

  // Sort alerts: CRITICAL first, then WARNING, then INFO. Within same severity, today first.
  alerts.sort((a, b) => {
    const severityWeight: Record<AlertSeverity, number> = {
      CRITICAL: 3,
      WARNING: 2,
      INFO: 1,
    };
    const diff = severityWeight[b.severity] - severityWeight[a.severity];
    if (diff !== 0) return diff;
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    return a.date.localeCompare(b.date);
  });

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const unassignedCount = alerts.filter(a => a.type === 'UNASSIGNED_SERVICE').length;
  const dayOffConflictCount = alerts.filter(a => a.type === 'DAYOFF_SERVICE_CONFLICT').length;
  const serviceOverlapConflictCount = alerts.filter(a => a.type === 'SERVICE_OVERLAP_CONFLICT').length;
  const missingScaleCount = alerts.filter(a => a.type === 'MISSING_SHIFT_SCALE').length;
  const urgentCount = alerts.filter(a => a.isToday || a.isTomorrow || a.severity === 'CRITICAL').length;
  const todayCount = alerts.filter(a => a.isToday).length;
  const todayConflictCount = alerts.filter(
    a => a.isToday && (a.type === 'DAYOFF_SERVICE_CONFLICT' || a.type === 'CATEGORY_MISMATCH' || a.type === 'SERVICE_OVERLAP_CONFLICT')
  ).length;
  const todayUnassignedCount = alerts.filter(a => a.isToday && a.type === 'UNASSIGNED_SERVICE').length;

  return {
    alerts,
    criticalCount,
    unassignedCount,
    dayOffConflictCount,
    serviceOverlapConflictCount,
    missingScaleCount,
    hasImmediateActionRequired: criticalCount > 0 || todayCount > 0,
    urgentCount,
    todayCount,
    todayConflictCount,
    todayUnassignedCount,
  };
}

import {
  Driver,
  TransportService,
  FreelancerCalculationResult,
  ContractedPackage,
  DayOffRecord,
  ShiftScaleConfig,
  Allocation,
  AirportTransferDirection,
} from '../types';

export const DEFAULT_PRICING = {
  package4h: 55.0,
  package8h: 95.0,
  overtimeHour: 15.0,
  mealAllowance: 15.0,
};

export interface MealOverrideConfig {
  isManual: boolean;
  mealGranted?: boolean;
  manualReason?: string;
}

/**
 * Calculates freelancer service billing based on exact business rules:
 * - Package 4h / 8h
 * - Overtime hours
 * - Meal subsidy: Smart detection (distinguishing short transfers from dinner services) + Operator Manual Insertion
 */
export function calculateFreelancerService(
  startInput: string | Date,
  endInput: string | Date,
  contractedPackage: ContractedPackage = 'AUTO_MELHOR_TARIFA',
  pricing = DEFAULT_PRICING,
  mealOverride?: MealOverrideConfig
): FreelancerCalculationResult {
  const start = new Date(startInput);
  const end = new Date(endInput);

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const durationMinutes = Math.round(diffMs / 60000);
  const durationHours = parseFloat((durationMinutes / 60).toFixed(2));

  let package4h = 0;
  let package8h = 0;
  let overtimeHours = 0;

  // Regra de Transição 4h para 8h (Confirmada pelo Cliente):
  // - Até 4.0h: Pacote 4h (sem horas extra)
  // - Entre 4.0h e 6.0h: Pacote 4h + Horas Extra (excesso arredondado por excesso: ex. 5h30 -> excesso 1.5h -> 2h extra)
  // - Ultrapassando as 6.0h: Transita para Pacote de 8h (sem horas extra até às 8.0h)
  // - Ultrapassando as 8.0h: Pacote 8h + Horas Extra excedentes a 8h (arredondadas por excesso: ex. 8h30 -> 1h extra)

  if (contractedPackage === 'PACOTE_8H') {
    package4h = 0;
    package8h = 1;
    if (durationHours > 8.0) {
      overtimeHours = Math.ceil(durationHours - 8.0);
    }
  } else {
    // PACOTE_4H ou AUTO_MELHOR_TARIFA
    if (durationHours <= 4.0) {
      package4h = 1;
      package8h = 0;
      overtimeHours = 0;
    } else if (durationHours <= 6.0) {
      // Quando um serviço de 4h atinge até 6h (ex: 5h30): Pacote 4h + 2h extra
      package4h = 1;
      package8h = 0;
      overtimeHours = Math.ceil(durationHours - 4.0);
    } else if (durationHours <= 8.0) {
      // Quando ultrapassa as 6 horas transita-se para o Pacote das 8 horas
      package4h = 0;
      package8h = 1;
      overtimeHours = 0;
    } else {
      // Ultrapassa as 8 horas
      package4h = 0;
      package8h = 1;
      overtimeHours = Math.ceil(durationHours - 8.0);
    }
  }

  // Refeição das 20h - Regra de Negócio:
  // Se for inserção manual pelo operador, prevalece a decisão manual
  const endHour = end.getHours();
  const endMinute = end.getMinutes();
  const endsAfter20h = endHour > 20 || (endHour === 20 && endMinute > 0);
  const durationOver20h = durationHours > 20.0;

  let mealGranted = false;
  let mealReason = 'Não aplicável (terminou antes das 20h)';
  let mealMode: 'AUTO' | 'MANUAL' = mealOverride?.isManual ? 'MANUAL' : 'AUTO';

  if (mealOverride?.isManual) {
    mealGranted = !!mealOverride.mealGranted;
    if (mealOverride.manualReason && mealOverride.manualReason.trim()) {
      mealReason = `Inserção Manual: ${mealOverride.manualReason.trim()} (${mealGranted ? 'SIM (+15€)' : 'NÃO'})`;
    } else {
      mealReason = mealGranted
        ? 'Inserção Manual pelo Operador: Atribuída refeição (+15.00 €)'
        : 'Inserção Manual pelo Operador: Sem atribuição de refeição (0.00 €)';
    }
  } else {
    // Modo Automático (Sugestão do Sistema):
    // Se o serviço termina após as 20h:
    // - Serviços curtos (ex: 19h30 às 20h15 = 45m / duração < 2h30) NÃO conferem refeição
    // - Serviços que cobrem o período de refeição com duração substantiva (ex: 18h00 às 22h00 = 4h) CONFEREM refeição
    if (endsAfter20h) {
      const formattedTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      if (durationHours < 2.5) {
        mealGranted = false;
        mealReason = `Terminou às ${formattedTime} mas duração é curta (${durationHours}h / ${durationMinutes}min) — Sugestão: NÃO confere refeição (ajustável manualmente)`;
      } else {
        mealGranted = true;
        mealReason = `Terminou às ${formattedTime} com duração significativa (${durationHours}h) cobrindo horário de refeição — Sugestão: SIM (+15€)`;
      }
    } else if (durationOver20h) {
      mealGranted = true;
      mealReason = `Duração total do serviço (${durationHours}h) excedeu 20h de trabalho`;
    }
  }

  const baseCost = package4h * pricing.package4h + package8h * pricing.package8h;
  const overtimeCost = overtimeHours * pricing.overtimeHour;
  const mealCost = mealGranted ? pricing.mealAllowance : 0;
  const totalCost = parseFloat((baseCost + overtimeCost + mealCost).toFixed(2));

  return {
    durationMinutes,
    durationHours,
    package4h,
    package8h,
    overtimeHours,
    mealGranted,
    mealReason,
    mealMode,
    baseCost,
    overtimeCost,
    mealCost,
    totalCost,
  };
}

/**
 * Validates whether a driver is legally and operationally qualified for a service.
 */
export function checkDriverQualification(driver: Driver, service: TransportService): {
  allowed: boolean;
  reason?: string;
} {
  if (service.requiredCategory === 'PESADOS_PASSAGEIROS') {
    if (driver.category !== 'MISTO_PESADOS') {
      return {
        allowed: false,
        reason: 'O serviço exige veículo Pesado de Passageiros. O motorista só está habilitado para Ligeiros (Carta B).',
      };
    }
  }
  return { allowed: true };
}

/**
 * Determines if an employee driver is on a rotating day-off or holiday on a given date (YYYY-MM-DD).
 */
export function getDriverDayStatus(
  driverId: string,
  dateStr: string,
  customDayOffs: DayOffRecord[],
  shiftScales: ShiftScaleConfig[]
): {
  isDayOff: boolean;
  type?: 'FOLGA_ROTATIVA' | 'FERIAS' | 'BAIXA_MEDICA' | 'COMPENSACAO' | 'TRABALHO';
  label: string;
  source: 'MANUAL' | 'ROTAÇÃO' | 'DISPONIVEL';
} {
  // 1. Check custom manual records (holidays, sick leave, manual adjustments)
  const manual = customDayOffs.find(d => d.driverId === driverId && d.date === dateStr);
  if (manual) {
    return {
      isDayOff: manual.blocked,
      type: manual.type,
      label:
        manual.type === 'FERIAS'
          ? 'Férias'
          : manual.type === 'BAIXA_MEDICA'
          ? 'Baixa Médica'
          : manual.type === 'COMPENSACAO'
          ? 'Compensação'
          : 'Folga Manual',
      source: 'MANUAL',
    };
  }

  // 2. Check rotating shift scale
  const scale = shiftScales.find(s => s.driverId === driverId);
  if (!scale) {
    return { isDayOff: false, type: 'TRABALHO', label: 'Disponível', source: 'DISPONIVEL' };
  }

  // Regra Confirmada pelo Cliente: Rotação Mensal Personalizada com Fins-de-Semana Alternados
  if (scale.cycleType === 'MENSAL_FDS_ALTERNADO') {
    const current = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = current.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

    // Calcular índice da semana a partir da data âncora
    const anchor = new Date(scale.anchorDate + 'T00:00:00');
    const diffTime = current.getTime() - anchor.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(diffDays / 7);
    const normalizedWeek = ((weekIndex % 2) + 2) % 2;

    // Padrão de alternância: semanas ímpares ou semanas pares de folga ao FDS
    const isWeekendOffWeek =
      scale.weekendOffPattern === 'SEMANAS_PARES' ? normalizedWeek === 0 : normalizedWeek === 1;

    if (isWeekendOffWeek) {
      // Semana de Folga ao Fim de Semana (Sábado e Domingo)
      if (isWeekendDay) {
        return {
          isDayOff: true,
          type: 'FOLGA_ROTATIVA',
          label: 'Folga Fim-de-Semana (Descanso Semanal)',
          source: 'ROTAÇÃO',
        };
      }
      return {
        isDayOff: false,
        type: 'TRABALHO',
        label: 'Em Escala (Semana de FDS Livre)',
        source: 'DISPONIVEL',
      };
    } else {
      // Semana de Serviço ao Fim de Semana: folga rotativa de 2 dias úteis
      const weekdayOffs = scale.weekdayOffDays || [2, 3]; // Padrão: Terça e Quarta
      if (weekdayOffs.includes(dayOfWeek)) {
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return {
          isDayOff: true,
          type: 'FOLGA_ROTATIVA',
          label: `Folga Semanal Rotativa (${dayNames[dayOfWeek]})`,
          source: 'ROTAÇÃO',
        };
      }
      return {
        isDayOff: false,
        type: 'TRABALHO',
        label: isWeekendDay ? 'Em Escala (FDS de Serviço)' : 'Em Escala (Dia Útil)',
        source: 'DISPONIVEL',
      };
    }
  }

  // Fallback para rotação clássica (6x2, 5x2, 4x2)
  const anchor = new Date(scale.anchorDate + 'T00:00:00');
  const current = new Date(dateStr + 'T00:00:00');

  const diffTime = current.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const cycleLength = scale.workDays + scale.offDays;
  const modDays = ((diffDays % cycleLength) + cycleLength) % cycleLength;

  if (modDays >= scale.workDays) {
    return {
      isDayOff: true,
      type: 'FOLGA_ROTATIVA',
      label: `Folga Rotativa (${scale.cycleType})`,
      source: 'ROTAÇÃO',
    };
  }

  return {
    isDayOff: false,
    type: 'TRABALHO',
    label: `Em Escala (Dia ${modDays + 1}/${scale.workDays})`,
    source: 'DISPONIVEL',
  };
}

// =========================================================================
// Regras de Integridade: Não-sobreposição de Serviços com Exceção de Aeroporto
// =========================================================================

export interface AirportServiceClassification {
  isAirport: boolean;
  direction?: AirportTransferDirection;
  reason: string;
}

export type OverlapRuleCode =
  | 'NO_OVERLAP'
  | 'ALLOWED_AIRPORT_COMBO'
  | 'REJECTED_AIRPORT_TIME_EXCEEDED'
  | 'REJECTED_AIRPORT_SAME_DIRECTION'
  | 'REJECTED_NON_AIRPORT'
  | 'REJECTED_MULTIPLE_SERVICES';

export interface ServiceOverlapValidationResult {
  hasOverlap: boolean;
  isAllowed: boolean;
  reason: string;
  ruleCode: OverlapRuleCode;
  conflictingService?: TransportService;
  chegadaService?: TransportService;
  saidaService?: TransportService;
  diffMinutes?: number;
}

/**
 * Normaliza e identifica se um serviço de transporte corresponde a um transfer de Aeroporto,
 * e se constitui uma Chegada (de Aeroporto) ou Saída (para Aeroporto).
 */
export function classifyAirportService(service: TransportService): AirportServiceClassification {
  if (service.transferDirection) {
    return {
      isAirport: true,
      direction: service.transferDirection,
      reason: `Classificado como Transfer de ${
        service.transferDirection === 'CHEGADA' ? 'Chegada ao Aeroporto' : 'Saída para o Aeroporto'
      }`,
    };
  }

  const normalize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const originNorm = normalize(service.origin);
  const destNorm = normalize(service.destination);
  const notesNorm = normalize(service.notes);
  const codeNorm = normalize(service.code);
  const clientNorm = normalize(service.clientName);

  const airportKeywords = [
    'aeroporto',
    'airport',
    'aerodromo',
    'aeródromo',
    'terminal 1',
    'terminal 2',
    'humberto delgado',
    'sa carneiro',
    'sá carneiro',
    'lisboa (lis)',
    'porto (opo)',
    'faro (fao)',
    'funchal (fnc)',
    '(lis)',
    '(opo)',
    '(fao)',
    '(fnc)',
    'pista',
    'voo',
    'flight',
  ];

  const originIsAirport = airportKeywords.some(k => originNorm.includes(k));
  const destIsAirport = airportKeywords.some(k => destNorm.includes(k));
  const notesHasAirport = airportKeywords.some(k => notesNorm.includes(k));

  const isAirport = originIsAirport || destIsAirport || notesHasAirport;

  if (!isAirport) {
    return {
      isAirport: false,
      reason: 'O serviço não é de/para o Aeroporto.',
    };
  }

  // Se a origem é o aeroporto (e destino não) -> Chegada (de Aeroporto)
  if (originIsAirport && !destIsAirport) {
    return {
      isAirport: true,
      direction: 'CHEGADA',
      reason: 'Chegada: Origem no Aeroporto (recolha de passageiros)',
    };
  }

  // Se o destino é o aeroporto (e origem não) -> Saída (para o Aeroporto)
  if (destIsAirport && !originIsAirport) {
    return {
      isAirport: true,
      direction: 'SAIDA',
      reason: 'Saída: Destino no Aeroporto (entrega de passageiros)',
    };
  }

  // Se ambos contêm menção a aeroporto ou está nas notas, verificar termos específicos de direção
  const chegadaKeywords = [
    'chegada',
    'arrival',
    'inbound',
    'desembarque',
    'recolha',
    'pick-up aeroporto',
    'pickup aeroporto',
  ];
  const saidaKeywords = [
    'saida',
    'saída',
    'departure',
    'outbound',
    'embarque',
    'partida',
    'drop-off aeroporto',
    'dropoff aeroporto',
  ];

  const hasChegada = chegadaKeywords.some(
    k => notesNorm.includes(k) || originNorm.includes(k) || codeNorm.includes(k) || clientNorm.includes(k)
  );
  const hasSaida = saidaKeywords.some(
    k => notesNorm.includes(k) || destNorm.includes(k) || codeNorm.includes(k) || clientNorm.includes(k)
  );

  if (hasChegada && !hasSaida) {
    return {
      isAirport: true,
      direction: 'CHEGADA',
      reason: 'Chegada de Aeroporto (indicado nos detalhes do voo/serviço)',
    };
  }

  if (hasSaida && !hasChegada) {
    return {
      isAirport: true,
      direction: 'SAIDA',
      reason: 'Saída para o Aeroporto (indicado nos detalhes do voo/serviço)',
    };
  }

  // Heurística padrão: se origem é aeroporto considera Chegada, caso contrário Saída
  if (originIsAirport) {
    return {
      isAirport: true,
      direction: 'CHEGADA',
      reason: 'Chegada: Origem no Aeroporto',
    };
  }

  return {
    isAirport: true,
    direction: 'SAIDA',
    reason: 'Saída: Destino no Aeroporto',
  };
}

/**
 * Valida a sobreposição entre dois serviços específicos para o mesmo motorista:
 * Regra:
 * - Se os serviços não se sobrepõem no tempo: permitido.
 * - Se se sobrepõem:
 *   - Ambos têm de ser serviços de e para o Aeroporto.
 *   - Tem de ser uma Chegada e uma Saída (não podem ser duas chegadas nem duas saídas).
 *   - O horário do transfer de saída NÃO pode ultrapassar 30 minutos para lá do horário do transfer de chegada.
 *     (Ex: Chegada às 09:00 e Saída às 09:30 -> aceitar sobreposição. Saída às 09:35 -> rejeitar).
 */
export function checkTwoServicesOverlap(
  serviceA: TransportService,
  serviceB: TransportService
): ServiceOverlapValidationResult {
  const startA = new Date(serviceA.scheduledStart).getTime();
  const endA = new Date(serviceA.scheduledEnd).getTime();
  const startB = new Date(serviceB.scheduledStart).getTime();
  const endB = new Date(serviceB.scheduledEnd).getTime();

  // Verifica se há sobreposição temporal nos intervalos [start, end)
  const isOverlapping = startA < endB && startB < endA;

  if (!isOverlapping) {
    return {
      hasOverlap: false,
      isAllowed: true,
      reason: 'Sem sobreposição horária entre os serviços.',
      ruleCode: 'NO_OVERLAP',
    };
  }

  const formatTime = (iso: string) => {
    const parts = iso.split('T');
    return parts[1] ? parts[1].slice(0, 5) : iso;
  };

  const classA = classifyAirportService(serviceA);
  const classB = classifyAirportService(serviceB);

  // 1. Exigência: ambos os serviços têm de ser de/para o Aeroporto
  if (!classA.isAirport || !classB.isAirport) {
    const nonAirportList: string[] = [];
    if (!classA.isAirport) nonAirportList.push(`${serviceA.code} (${serviceA.origin} → ${serviceA.destination})`);
    if (!classB.isAirport) nonAirportList.push(`${serviceB.code} (${serviceB.origin} → ${serviceB.destination})`);

    return {
      hasOverlap: true,
      isAllowed: false,
      reason: `Sobreposição não permitida: O motorista não pode estar alocado a dois serviços simultâneos, exceto se ambos forem transfers de Chegada e Saída de e para o Aeroporto. Serviços sem enquadramento aeroportuário: ${nonAirportList.join(', ')}.`,
      ruleCode: 'REJECTED_NON_AIRPORT',
      conflictingService: serviceB,
    };
  }

  // 2. Exigência: um tem de ser Chegada e o outro tem de ser Saída
  if (classA.direction === classB.direction) {
    const dirLabel = classA.direction === 'CHEGADA' ? 'Chegada ao Aeroporto' : 'Saída para o Aeroporto';
    return {
      hasOverlap: true,
      isAllowed: false,
      reason: `Sobreposição não permitida: Ambos os serviços são de ${dirLabel} (${serviceA.code} e ${serviceB.code}). A regra de integridade exige que os dois serviços simultâneos sejam obrigatoriamente uma Chegada e uma Saída de e para o Aeroporto.`,
      ruleCode: 'REJECTED_AIRPORT_SAME_DIRECTION',
      conflictingService: serviceB,
    };
  }

  // Identificar qual é o serviço de Chegada e qual é o de Saída
  const chegada = classA.direction === 'CHEGADA' ? serviceA : serviceB;
  const saida = classA.direction === 'SAIDA' ? serviceA : serviceB;

  const chegadaStart = new Date(chegada.scheduledStart).getTime();
  const saidaStart = new Date(saida.scheduledStart).getTime();

  // Calcular a diferença em minutos entre o início do transfer de Saída e o início do transfer de Chegada
  // "aceitar a sobreposição de serviço desde que o horário do transfer de saída não ultrapasse os 30 minutos para lá do horário do transfer de Chegada"
  const diffMinutes = Math.round((saidaStart - chegadaStart) / 60000);

  const chegadaTimeStr = formatTime(chegada.scheduledStart);
  const saidaTimeStr = formatTime(saida.scheduledStart);

  // Validação: saída não pode ultrapassar 30 minutos após a chegada
  if (diffMinutes > 30) {
    return {
      hasOverlap: true,
      isAllowed: false,
      reason: `Sobreposição de Aeroporto não aceite: O horário do transfer de saída (${saida.code} às ${saidaTimeStr}) ultrapassa os 30 minutos para lá do horário da chegada (${chegada.code} às ${chegadaTimeStr}). Diferença de +${diffMinutes} min (máximo permitido: 30 minutos).`,
      ruleCode: 'REJECTED_AIRPORT_TIME_EXCEEDED',
      conflictingService: serviceB,
      chegadaService: chegada,
      saidaService: saida,
      diffMinutes,
    };
  }

  // Se a saída ocorrer mais de 30 minutos antes da chegada, também viola a janela de compatibilidade operacional
  if (diffMinutes < -30) {
    return {
      hasOverlap: true,
      isAllowed: false,
      reason: `Sobreposição de Aeroporto não aceite: A saída (${saida.code} às ${saidaTimeStr}) tem início mais de 30 minutos antes da chegada (${chegada.code} às ${chegadaTimeStr}) — desfasamento de ${Math.abs(diffMinutes)} min (limite: 30 minutos).`,
      ruleCode: 'REJECTED_AIRPORT_TIME_EXCEEDED',
      conflictingService: serviceB,
      chegadaService: chegada,
      saidaService: saida,
      diffMinutes,
    };
  }

  // Sobreposição Aprovada!
  const diffLabel =
    diffMinutes === 0
      ? 'ao mesmo horário (0 min)'
      : diffMinutes > 0
      ? `+${diffMinutes} min após a chegada`
      : `${Math.abs(diffMinutes)} min antes da chegada`;

  return {
    hasOverlap: true,
    isAllowed: true,
    reason: `Sobreposição autorizada pela Regra de Aeroporto: Transfer de Chegada (${chegada.code} às ${chegadaTimeStr}) e Transfer de Saída (${saida.code} às ${saidaTimeStr}) com desfasamento de ${diffLabel} (dentro do limite máximo de 30 minutos).`,
    ruleCode: 'ALLOWED_AIRPORT_COMBO',
    conflictingService: serviceB,
    chegadaService: chegada,
    saidaService: saida,
    diffMinutes,
  };
}

/**
 * Valida a alocação de um motorista a um serviço de transporte em relação a todos os outros
 * serviços já atribuídos a esse motorista no sistema.
 */
export function validateDriverAllocationsOverlap(
  driverId: string,
  targetService: TransportService,
  allServices: TransportService[],
  allAllocations: Allocation[]
): ServiceOverlapValidationResult {
  // Obter todas as outras alocações ativas para este motorista (excluindo o próprio serviço alvo)
  const otherAllocations = allAllocations.filter(
    a => a.driverId === driverId && a.serviceId !== targetService.id && a.status !== 'CANCELADO'
  );

  const overlapResults: ServiceOverlapValidationResult[] = [];

  for (const alloc of otherAllocations) {
    const otherService = allServices.find(s => s.id === alloc.serviceId);
    if (!otherService || otherService.status === 'CANCELADO') continue;

    const res = checkTwoServicesOverlap(targetService, otherService);
    if (res.hasOverlap) {
      overlapResults.push(res);
    }
  }

  if (overlapResults.length === 0) {
    return {
      hasOverlap: false,
      isAllowed: true,
      reason: 'Sem sobreposição com outros serviços do motorista.',
      ruleCode: 'NO_OVERLAP',
    };
  }

  // Se sobrepõe com 2 ou mais outros serviços -> motorista ficaria com 3 ou mais serviços simultâneos!
  // A regra define estritamente: "o motorista pode estar alocado a dois serviços em simultaneo..."
  if (overlapResults.length > 1) {
    const conflictingCodes = overlapResults
      .map(r => r.conflictingService?.code)
      .filter(Boolean)
      .join(', ');
    return {
      hasOverlap: true,
      isAllowed: false,
      reason: `Sobreposição tripla/múltipla não permitida: O motorista já tem ${overlapResults.length} serviços simultâneos (${conflictingCodes}). O regulamento apenas permite a alocação a no máximo dois serviços em simultâneo (Chegada e Saída de Aeroporto).`,
      ruleCode: 'REJECTED_MULTIPLE_SERVICES',
      conflictingService: overlapResults[0].conflictingService,
    };
  }

  // Exatamente uma sobreposição detetada
  return overlapResults[0];
}

export interface DriverOverlapReportItem {
  id: string;
  driverId: string;
  driverName: string;
  mechanicalNumber: string;
  serviceA: TransportService;
  serviceB: TransportService;
  validation: ServiceOverlapValidationResult;
  isAllowed: boolean;
  date: string;
}

/**
 * Percorre todas as alocações do sistema e deteta todas as sobreposições de serviços entre motoristas,
 * classificando-as entre autorizadas (Chegada + Saída de Aeroporto <= 30m) ou violações de integridade.
 */
export function getAllDriverServiceOverlaps(
  services: TransportService[],
  allocations: Allocation[],
  drivers: Driver[]
): DriverOverlapReportItem[] {
  const reports: DriverOverlapReportItem[] = [];
  const processedPairs = new Set<string>();

  // Agrupar alocações por motorista
  const activeAllocations = allocations.filter(
    a => a.driverId && a.status !== 'CANCELADO'
  );

  for (let i = 0; i < activeAllocations.length; i++) {
    for (let j = i + 1; j < activeAllocations.length; j++) {
      const allocA = activeAllocations[i];
      const allocB = activeAllocations[j];

      // Apenas interessa se for o mesmo motorista
      if (allocA.driverId !== allocB.driverId) continue;

      const pairKey = [allocA.serviceId, allocB.serviceId].sort().join(':::');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const serviceA = services.find(s => s.id === allocA.serviceId);
      const serviceB = services.find(s => s.id === allocB.serviceId);

      if (!serviceA || !serviceB || serviceA.status === 'CANCELADO' || serviceB.status === 'CANCELADO') {
        continue;
      }

      const validation = checkTwoServicesOverlap(serviceA, serviceB);
      if (validation.hasOverlap) {
        const driver = drivers.find(d => d.id === allocA.driverId);
        reports.push({
          id: `overlap-${allocA.driverId}-${serviceA.id}-${serviceB.id}`,
          driverId: allocA.driverId,
          driverName: driver ? driver.name : 'Motorista Desconhecido',
          mechanicalNumber: driver ? driver.mechanicalNumber : '',
          serviceA,
          serviceB,
          validation,
          isAllowed: validation.isAllowed,
          date: serviceA.scheduledStart.split('T')[0],
        });
      }
    }
  }

  return reports;
}


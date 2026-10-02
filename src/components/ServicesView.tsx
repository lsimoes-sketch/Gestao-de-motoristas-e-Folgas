import React, { useState } from 'react';
import {
  Truck,
  UserCheck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Calculator,
  Utensils,
  Edit3,
  Bot,
  Download,
  Upload,
  FileSpreadsheet,
  Plane,
} from 'lucide-react';
import {
  TransportService,
  Driver,
  Vehicle,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
  FreelancerSettlement,
  ContractedPackage,
} from '../types';
import {
  checkDriverQualification,
  getDriverDayStatus,
  calculateFreelancerService,
  validateDriverAllocationsOverlap,
  DEFAULT_PRICING,
} from '../utils/rulesEngine';
import { ExportServicesModal } from './ExportServicesModal';
import { ImportServicesModal } from './ImportServicesModal';

interface ServicesViewProps {
  services: TransportService[];
  drivers: Driver[];
  vehicles: Vehicle[];
  allocations: Allocation[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  onSaveAllocation: (allocation: Allocation) => void;
  onCompleteServiceAndSettle: (settlement: FreelancerSettlement) => void;
  onOpenNewServiceModal: () => void;
  onBatchAddServices?: (newServices: TransportService[]) => void;
  onOpenBackupModal?: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  drivers,
  vehicles,
  allocations,
  shiftScales,
  dayOffs,
  onSaveAllocation,
  onCompleteServiceAndSettle,
  onOpenNewServiceModal,
  onBatchAddServices,
  onOpenBackupModal,
}) => {
  const [selectedService, setSelectedService] = useState<TransportService | null>(null);
  const [allocatingService, setAllocatingService] = useState<TransportService | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [settlingService, setSettlingService] = useState<{
    service: TransportService;
    allocation: Allocation;
    driver: Driver;
  } | null>(null);

  // Form states for allocation
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [contractedPackage, setContractedPackage] = useState<ContractedPackage>('AUTO_MELHOR_TARIFA');

  // Form states for settling
  const [settleStart, setSettleStart] = useState<string>('');
  const [settleEnd, setSettleEnd] = useState<string>('');
  const [settleMealMode, setSettleMealMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [settleMealGranted, setSettleMealGranted] = useState<boolean>(false);
  const [settleMealReason, setSettleMealReason] = useState<string>('');

  const openAllocationModal = (service: TransportService) => {
    const existingAlloc = allocations.find(a => a.serviceId === service.id);
    setAllocatingService(service);
    setSelectedDriverId(existingAlloc ? existingAlloc.driverId : '');
    setSelectedVehicleId(existingAlloc ? existingAlloc.vehicleId : '');
    setContractedPackage(existingAlloc?.contractedPackage || 'AUTO_MELHOR_TARIFA');
  };

  const handleConfirmAllocation = () => {
    if (!allocatingService || !selectedDriverId || !selectedVehicleId) return;

    const newAlloc: Allocation = {
      id: allocations.find(a => a.serviceId === allocatingService.id)?.id || `alloc-${Date.now()}`,
      serviceId: allocatingService.id,
      driverId: selectedDriverId,
      vehicleId: selectedVehicleId,
      contractedPackage,
      status: 'ATRIBUIDO',
    };

    onSaveAllocation(newAlloc);
    setAllocatingService(null);
  };

  const openSettlementModal = (service: TransportService) => {
    const alloc = allocations.find(a => a.serviceId === service.id);
    if (!alloc) return;
    const driver = drivers.find(d => d.id === alloc.driverId);
    if (!driver) return;

    const startVal = alloc.actualStart || service.scheduledStart;
    const endVal = alloc.actualEnd || service.scheduledEnd;

    setSettlingService({ service, allocation: alloc, driver });
    setSettleStart(startVal);
    setSettleEnd(endVal);
    setSettleMealMode('AUTO');
    setSettleMealGranted(false);
    setSettleMealReason('');
  };

  const handleConfirmSettlement = () => {
    if (!settlingService) return;
    const { service, allocation, driver } = settlingService;

    const calc = calculateFreelancerService(
      settleStart,
      settleEnd,
      allocation.contractedPackage || 'AUTO_MELHOR_TARIFA',
      DEFAULT_PRICING,
      {
        isManual: settleMealMode === 'MANUAL',
        mealGranted: settleMealGranted,
        manualReason: settleMealReason,
      }
    );

    const settlement: FreelancerSettlement = {
      id: `set-${Date.now()}`,
      allocationId: allocation.id,
      serviceCode: service.code,
      driverId: driver.id,
      driverName: driver.name,
      actualStart: settleStart,
      actualEnd: settleEnd,
      durationHours: calc.durationHours,
      package4h: calc.package4h,
      package8h: calc.package8h,
      overtimeHours: calc.overtimeHours,
      mealGranted: calc.mealGranted,
      mealReason: calc.mealReason,
      mealMode: calc.mealMode,
      totalAmount: calc.totalCost,
      closedAt: new Date().toISOString(),
    };

    onCompleteServiceAndSettle(settlement);
    setSettlingService(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Planeamento de Serviços & Alocação</h1>
          <p className="text-sm text-slate-500">
            Validação rigorosa de categoria de veículo (Ligeiros vs Pesados), importação em lote e consulta de folgas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onBatchAddServices && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-2"
              title="Importar múltiplos serviços a partir de ficheiro CSV ou Excel em vez de inserção manual"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Importar em Lote (CSV/Excel)</span>
            </button>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-2"
            title="Exportar todos os serviços ou filtrados para ficheiro Excel, CSV ou JSON"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar Serviços</span>
          </button>

          <button
            onClick={onOpenNewServiceModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Services List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Código / Tipo</th>
                <th className="py-3.5 px-4">Data & Horário</th>
                <th className="py-3.5 px-4">Categoria Exigida</th>
                <th className="py-3.5 px-4">Itinerário</th>
                <th className="py-3.5 px-4">Recursos Alocados</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map(service => {
                const alloc = allocations.find(a => a.serviceId === service.id);
                const driver = alloc ? drivers.find(d => d.id === alloc.driverId) : null;
                const vehicle = alloc ? vehicles.find(v => v.id === alloc.vehicleId) : null;

                const startDate = service.scheduledStart.split('T')[0];
                const startTime = service.scheduledStart.split('T')[1];
                const endTime = service.scheduledEnd.split('T')[1];

                // Check validations
                let hasCategoryError = false;
                let hasDayOffWarning = false;
                let warningText = '';
                const overlapVal = driver
                  ? validateDriverAllocationsOverlap(driver.id, service, services, allocations)
                  : { hasOverlap: false, isAllowed: true, reason: '', ruleCode: 'NO_OVERLAP' as const };

                if (driver) {
                  const qual = checkDriverQualification(driver, service);
                  if (!qual.allowed) {
                    hasCategoryError = true;
                    warningText = qual.reason || 'Incompatível com Pesados.';
                  } else if (driver.regime === 'ASSALARIADO') {
                    const status = getDriverDayStatus(driver.id, startDate, dayOffs, shiftScales);
                    if (status.isDayOff) {
                      hasDayOffWarning = true;
                      warningText = `Em ${status.label} na data.`;
                    }
                  }
                }

                return (
                  <tr key={service.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Código e Tipo */}
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-slate-900">{service.code}</div>
                      <span className="text-[11px] text-slate-500 font-medium capitalize">
                        {service.type.toLowerCase().replace(/_/g, ' ')} ({service.passengers} pax)
                      </span>
                    </td>

                    {/* Data e Horário */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-900">{startDate}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {startTime} - {endTime}
                        </span>
                      </div>
                    </td>

                    {/* Categoria Exigida */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          service.requiredCategory === 'PESADOS_PASSAGEIROS'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {service.requiredCategory === 'PESADOS_PASSAGEIROS'
                          ? 'Pesados de Passageiros'
                          : 'Ligeiros'}
                      </span>
                    </td>

                    {/* Itinerário */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="truncate font-medium text-slate-900" title={service.origin}>
                        {service.origin}
                      </div>
                      <div className="truncate text-xs text-slate-500" title={service.destination}>
                        ↳ {service.destination}
                      </div>
                    </td>

                    {/* Recursos Alocados */}
                    <td className="py-4 px-4">
                      {driver && vehicle ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{driver.name}</span>
                            <span className="text-[10px] px-1 py-0.2 bg-slate-100 rounded text-slate-600 font-mono">
                              {driver.regime === 'ASSALARIADO' ? 'IHT' : 'FL'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>
                              {vehicle.plate} ({vehicle.brandModel})
                            </span>
                          </div>

                          {/* Warning Badges */}
                          {hasCategoryError && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <ShieldAlert className="w-3 h-3 shrink-0" />
                              <span>BLOQUEIO: Motorista só Ligeiros!</span>
                            </div>
                          )}
                          {hasDayOffWarning && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>AVISO: {warningText}</span>
                            </div>
                          )}
                          {overlapVal.hasOverlap && (
                            overlapVal.isAllowed ? (
                              <div
                                className="flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-300"
                                title={overlapVal.reason}
                              >
                                <Plane className="w-3 h-3 text-sky-600 shrink-0" />
                                <span>
                                  Sobreposição Aeroporto ({overlapVal.conflictingService?.code}
                                  {overlapVal.diffMinutes !== undefined ? ` • ${overlapVal.diffMinutes >= 0 ? `+${overlapVal.diffMinutes}m` : `${overlapVal.diffMinutes}m`}` : ''})
                                </span>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300"
                                title={overlapVal.reason}
                              >
                                <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>SOBREPOSIÇÃO NÃO PERMITIDA ({overlapVal.conflictingService?.code})</span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium px-2 py-1 bg-amber-50 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          Pendente de alocação
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          service.status === 'CONFIRMADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : service.status === 'CONCLUIDO'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {service.status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => openAllocationModal(service)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                      >
                        {driver ? 'Alterar' : 'Alocar'}
                      </button>

                      {driver && driver.regime === 'FREELANCER' && (
                        <button
                          onClick={() => openSettlementModal(service)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition-colors"
                        >
                          Apurar FL
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Modal */}
      {allocatingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Alocação Operacional
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Alocar Motorista & Veículo ({allocatingService.code})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Exigência do Serviço:{' '}
                <strong className="text-slate-800">
                  {allocatingService.requiredCategory === 'PESADOS_PASSAGEIROS'
                    ? 'Pesados de Passageiros (Autocarro/Minibus)'
                    : 'Ligeiros'}
                </strong>{' '}
                para{' '}
                <strong>{allocatingService.scheduledStart.split('T')[0]}</strong>.
              </p>
            </div>

            {/* Select Driver with live validation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Motorista Disponível:</label>
              <select
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Selecione o motorista --</option>
                {drivers.map(driver => {
                  const serviceDate = allocatingService.scheduledStart.split('T')[0];
                  const qual = checkDriverQualification(driver, allocatingService);
                  const dayOff =
                    driver.regime === 'ASSALARIADO'
                      ? getDriverDayStatus(driver.id, serviceDate, dayOffs, shiftScales)
                      : null;

                  const isInactive = driver.active === false;
                  const overlapCheck = validateDriverAllocationsOverlap(
                    driver.id,
                    allocatingService,
                    services,
                    allocations
                  );
                  let overlapTag = '';
                  if (overlapCheck.hasOverlap) {
                    if (overlapCheck.isAllowed) {
                      const diffStr =
                        overlapCheck.diffMinutes !== undefined
                          ? overlapCheck.diffMinutes >= 0
                            ? `+${overlapCheck.diffMinutes}m`
                            : `${overlapCheck.diffMinutes}m`
                          : '';
                      overlapTag = ` [✈️ SOBREPOSIÇÃO AEROPORTO ${diffStr}]`;
                    } else {
                      overlapTag = ' [⛔ SOBREPOSIÇÃO RECUSADA]';
                    }
                  }

                  return (
                    <option
                      key={driver.id}
                      value={driver.id}
                      disabled={isInactive || !qual.allowed}
                      className={
                        isInactive
                          ? 'text-slate-400 bg-slate-100 italic'
                          : !qual.allowed
                          ? 'text-rose-400 bg-rose-50'
                          : !overlapCheck.isAllowed
                          ? 'text-rose-700 font-bold bg-rose-50'
                          : ''
                      }
                    >
                      {driver.name} ({driver.regime === 'ASSALARIADO' ? 'Assalariado IHT' : 'Free-lancer'}) -{' '}
                      {driver.category === 'MISTO_PESADOS' ? 'Ligeiros + Pesados' : 'Apenas Ligeiros'}
                      {isInactive ? ' [INATIVO]' : ''}
                      {!isInactive && !qual.allowed ? ' [NÃO HABILITADO PARA PESADOS]' : ''}
                      {!isInactive && dayOff?.isDayOff ? ` [EM ${dayOff.label.toUpperCase()}]` : ''}
                      {!isInactive && overlapTag}
                    </option>
                  );
                })}
              </select>

              {/* Real-time driver feedback box */}
              {selectedDriverId && (
                (() => {
                  const currentDriver = drivers.find(d => d.id === selectedDriverId);
                  if (!currentDriver) return null;
                  const serviceDate = allocatingService.scheduledStart.split('T')[0];
                  const qual = checkDriverQualification(currentDriver, allocatingService);
                  const dayOff =
                    currentDriver.regime === 'ASSALARIADO'
                      ? getDriverDayStatus(currentDriver.id, serviceDate, dayOffs, shiftScales)
                      : null;
                  const overlapVal = validateDriverAllocationsOverlap(
                    currentDriver.id,
                    allocatingService,
                    services,
                    allocations
                  );

                  if (currentDriver.active === false) {
                    return (
                      <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Motorista Inativo:</strong> Este motorista está atualmente inativo no sistema. Reative o perfil na Gestão de Motoristas para permitir novas alocações.
                        </div>
                      </div>
                    );
                  }

                  if (!qual.allowed) {
                    return (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Restrição de Categoria:</strong> {qual.reason}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {dayOff?.isDayOff && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Alerta de Folga:</strong> {currentDriver.name} encontra-se em{' '}
                            <strong>{dayOff.label}</strong> no dia {serviceDate}. (Alocação requer
                            confirmação do gestor).
                          </div>
                        </div>
                      )}

                      {overlapVal.hasOverlap && (
                        overlapVal.isAllowed ? (
                          <div className="p-3 bg-sky-50 border border-sky-300 rounded-lg text-xs text-sky-950 flex items-start gap-2">
                            <Plane className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                            <div>
                              <strong>Sobreposição de Aeroporto Autorizada:</strong> {overlapVal.reason}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong>Conflito de Sobreposição de Serviços:</strong> {overlapVal.reason}
                            </div>
                          </div>
                        )
                      )}

                      {!dayOff?.isDayOff && !overlapVal.hasOverlap && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Motorista apto, sem sobreposições e disponível para o serviço.</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Select Vehicle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Veículo:</label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Selecione o veículo --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brandModel} ({v.category === 'PESADOS_PASSAGEIROS' ? 'Pesado' : 'Ligeiro'}, {v.seats} pax)
                  </option>
                ))}
              </select>
            </div>

            {/* Modalidade de Pacote se for Freelancer */}
            {selectedDriverId &&
              drivers.find(d => d.id === selectedDriverId)?.regime === 'FREELANCER' && (
                <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Regra de Cobrança Free-lancer:</span>
                  </label>
                  <select
                    value={contractedPackage}
                    onChange={e => setContractedPackage(e.target.value as ContractedPackage)}
                    className="w-full text-xs rounded-md border border-slate-300 p-2 focus:outline-none bg-white"
                  >
                    <option value="AUTO_MELHOR_TARIFA">
                      Automático: &le;4h Pacote 4h | &gt;4h Pacote 8h (+ horas extra)
                    </option>
                    <option value="PACOTE_4H">Contratado Meio-Dia (Pacote 4h fixo + horas extra)</option>
                    <option value="PACOTE_8H">Contratado Dia Inteiro (Pacote 8h fixo + horas extra)</option>
                  </select>
                </div>
              )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAllocatingService(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAllocation}
                disabled={!selectedDriverId || !selectedVehicleId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                Confirmar Alocação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Freelancer Modal */}
      {settlingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Fecho Operacional & Apuramento
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Apurar Serviço Free-lancer ({settlingService.service.code})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Motorista: <strong>{settlingService.driver.name}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Início Real:</label>
                <input
                  type="datetime-local"
                  value={settleStart}
                  onChange={e => setSettleStart(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Término Real:</label>
                <input
                  type="datetime-local"
                  value={settleEnd}
                  onChange={e => setSettleEnd(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Manual Meal Selection Section (As requested by user) */}
            <div className="pt-1 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Suplemento de Refeição:</span>
                </label>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setSettleMealMode('AUTO')}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      settleMealMode === 'AUTO'
                        ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    <span>Auto (Sugestão)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleMealMode('MANUAL')}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      settleMealMode === 'MANUAL'
                        ? 'bg-purple-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Manual</span>
                  </button>
                </div>
              </div>

              {settleMealMode === 'MANUAL' ? (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">
                      Atribuir Refeição (+15.00 €)?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSettleMealGranted(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          settleMealGranted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        SIM (+15€)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettleMealGranted(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          !settleMealGranted
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        NÃO (0€)
                      </button>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={settleMealReason}
                      onChange={e => setSettleMealReason(e.target.value)}
                      placeholder="Observação da decisão manual (ex: autorizado pela operação)"
                      className="w-full text-xs rounded-lg border border-purple-200 bg-white p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <strong>Regra do Sistema:</strong> Serviços curtos (ex: 19h30 às 20h15) não conferem refeição. Serviços cobrindo horário de jantar após as 20h (ex: 18h às 22h) conferem.
                </div>
              )}
            </div>

            {/* Live Calculation Preview inside Modal */}
            {settleStart && settleEnd && (
              (() => {
                const calc = calculateFreelancerService(
                  settleStart,
                  settleEnd,
                  settlingService.allocation.contractedPackage || 'AUTO_MELHOR_TARIFA',
                  DEFAULT_PRICING,
                  {
                    isManual: settleMealMode === 'MANUAL',
                    mealGranted: settleMealGranted,
                    manualReason: settleMealReason,
                  }
                );
                return (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>Resultado do Cálculo Determinístico ({calc.mealMode}):</span>
                      <span className="text-sm font-bold text-emerald-700">{calc.totalCost} €</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <div>Duração: <strong>{calc.durationHours}h</strong> ({calc.durationMinutes} min)</div>
                      <div>
                        Pacote Base:{' '}
                        <strong>
                          {calc.package4h > 0 ? '1x Pacote 4h' : calc.package8h > 0 ? '1x Pacote 8h' : 'Nenhum'}
                        </strong>
                      </div>
                      <div>Horas Extra: <strong>{calc.overtimeHours}h</strong></div>
                      <div>
                        Refeição:{' '}
                        <strong className={calc.mealGranted ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {calc.mealGranted ? 'SIM (+15€)' : 'NÃO'}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-800 italic pt-1 border-t border-emerald-200">
                      {calc.mealReason}
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettlingService(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                Gravar Apuramento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Services Modal */}
      {isExportModalOpen && (
        <ExportServicesModal
          services={services}
          allocations={allocations}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setIsExportModalOpen(false)}
          onOpenSystemBackup={onOpenBackupModal}
        />
      )}

      {/* Import Services in Bulk Modal */}
      {isImportModalOpen && onBatchAddServices && (
        <ImportServicesModal
          onImportServices={onBatchAddServices}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </div>
  );
};

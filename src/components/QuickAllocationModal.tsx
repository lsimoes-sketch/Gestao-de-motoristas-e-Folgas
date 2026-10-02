import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Plane,
} from 'lucide-react';
import {
  TransportService,
  Driver,
  Vehicle,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
  ContractedPackage,
} from '../types';
import {
  getDriverDayStatus,
  checkDriverQualification,
  validateDriverAllocationsOverlap,
} from '../utils/rulesEngine';

interface QuickAllocationModalProps {
  isOpen: boolean;
  service: TransportService | null;
  drivers: Driver[];
  vehicles: Vehicle[];
  allocations: Allocation[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  allServices?: TransportService[];
  onClose: () => void;
  onSaveAllocation: (allocation: Allocation) => void;
  onNavigateToServices?: () => void;
}

export const QuickAllocationModal: React.FC<QuickAllocationModalProps> = ({
  isOpen,
  service,
  drivers,
  vehicles,
  allocations,
  shiftScales,
  dayOffs,
  allServices = [],
  onClose,
  onSaveAllocation,
  onNavigateToServices,
}) => {
  if (!isOpen || !service) return null;

  const existingAlloc = allocations.find(a => a.serviceId === service.id);
  const serviceDate = service.scheduledStart.split('T')[0];

  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    existingAlloc ? existingAlloc.driverId : ''
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    existingAlloc ? existingAlloc.vehicleId : ''
  );
  const [contractedPackage, setContractedPackage] = useState<ContractedPackage>(
    existingAlloc?.contractedPackage || 'AUTO_MELHOR_TARIFA'
  );

  // Sync when service changes
  useEffect(() => {
    if (service) {
      const alloc = allocations.find(a => a.serviceId === service.id);
      setSelectedDriverId(alloc ? alloc.driverId : '');
      setSelectedVehicleId(alloc ? alloc.vehicleId : '');
      setContractedPackage(alloc?.contractedPackage || 'AUTO_MELHOR_TARIFA');
    }
  }, [service, allocations]);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Validation checks for chosen driver
  const driverStatus = selectedDriver
    ? getDriverDayStatus(selectedDriver.id, serviceDate, dayOffs, shiftScales)
    : null;
  const driverQual = selectedDriver
    ? checkDriverQualification(selectedDriver, service)
    : null;

  // Validation check for chosen vehicle
  const isVehicleCategoryMismatch =
    selectedVehicle &&
    service.requiredCategory === 'PESADOS_PASSAGEIROS' &&
    selectedVehicle.category !== 'PESADOS_PASSAGEIROS';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !selectedDriverId || !selectedVehicleId) return;

    const newAlloc: Allocation = {
      id: existingAlloc?.id || `alloc-${Date.now()}`,
      serviceId: service.id,
      driverId: selectedDriverId,
      vehicleId: selectedVehicleId,
      contractedPackage,
      status: 'ATRIBUIDO',
    };

    onSaveAllocation(newAlloc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Resolver Escala: {service.code}
              </h3>
              <p className="text-xs text-slate-300">
                Alocação e resolução rápida de conflito de serviço
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Service Details Card */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-bold text-slate-900 text-sm">{service.clientName}</span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${
                  service.requiredCategory === 'PESADOS_PASSAGEIROS'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {service.requiredCategory === 'PESADOS_PASSAGEIROS'
                  ? 'Exige Pesados de Passageiros'
                  : 'Ligeiros'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Data: <strong>{serviceDate}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Horário:{' '}
                  <strong>
                    {service.scheduledStart.split('T')[1]} - {service.scheduledEnd.split('T')[1]}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {service.origin} → {service.destination}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">
            {/* Driver Select with validation cues */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Motorista a Atribuir</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Verifique a disponibilidade e folgas
                </span>
              </label>

              <select
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um motorista...</option>
                {drivers.map(driver => {
                  const status = getDriverDayStatus(driver.id, serviceDate, dayOffs, shiftScales);
                  const qual = checkDriverQualification(driver, service);
                  const overlap = allServices.length
                    ? validateDriverAllocationsOverlap(driver.id, service, allServices, allocations)
                    : { hasOverlap: false, isAllowed: true, reason: '', ruleCode: 'NO_OVERLAP' as const };

                  let statusText = 'Disponível';
                  if (status.isDayOff) {
                    statusText = `⚠️ EM ${status.label.toUpperCase()}`;
                  } else if (!qual.allowed) {
                    statusText = '⚠️ APENAS LIGEIROS (NÃO HABILITADO)';
                  } else if (overlap.hasOverlap) {
                    if (overlap.isAllowed) {
                      const diffStr =
                        overlap.diffMinutes !== undefined
                          ? overlap.diffMinutes >= 0
                            ? `+${overlap.diffMinutes}m`
                            : `${overlap.diffMinutes}m`
                          : '';
                      statusText = `✈️ SOBREPOSIÇÃO AEROPORTO (${diffStr})`;
                    } else {
                      statusText = '⛔ SOBREPOSIÇÃO NÃO PERMITIDA';
                    }
                  }

                  const regimeText = driver.regime === 'ASSALARIADO' ? 'IHT' : 'FL';
                  return (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.mechanicalNumber} • {regimeText}) — [{statusText}]
                    </option>
                  );
                })}
              </select>

              {/* Dynamic Warning Alert for Driver */}
              {selectedDriver && driverStatus?.isDayOff && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Aviso de Folga:</span> O motorista {selectedDriver.name} está em{' '}
                    <strong>{driverStatus.label}</strong> nesta data ({serviceDate}). Atribuir este serviço criará uma violação de descanso.
                  </div>
                </div>
              )}

              {selectedDriver && driverQual && !driverQual.allowed && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Incompatibilidade:</span> {driverQual.reason}
                  </div>
                </div>
              )}

              {/* Driver Service Overlap Alert */}
              {selectedDriver && allServices.length > 0 && (() => {
                const overlap = validateDriverAllocationsOverlap(selectedDriver.id, service, allServices, allocations);
                if (!overlap.hasOverlap) return null;

                if (overlap.isAllowed) {
                  return (
                    <div className="mt-2 p-3 bg-sky-50 border border-sky-300 rounded-xl text-xs text-sky-950 flex items-start gap-2">
                      <Plane className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Sobreposição de Aeroporto Autorizada:</span> {overlap.reason}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Conflito de Sobreposição de Serviços:</span> {overlap.reason}
                    </div>
                  </div>
                );
              })()}

              {selectedDriver && !driverStatus?.isDayOff && driverQual?.allowed && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Motorista verificado e pronto para alocação.</span>
                </div>
              )}
            </div>

            {/* Vehicle Select */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Viatura a Atribuir</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Capacidade mínima: {service.passengers} lugares
                </span>
              </label>

              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma viatura...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate} • {v.brandModel} ({v.seats} lugares •{' '}
                    {v.category === 'PESADOS_PASSAGEIROS' ? 'Pesado' : 'Ligeiro'})
                  </option>
                ))}
              </select>

              {isVehicleCategoryMismatch && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção:</span> A viatura selecionada é um Ligeiro, mas o serviço exige Pesado de Passageiros.
                  </div>
                </div>
              )}
            </div>

            {/* If Freelancer, package selection */}
            {selectedDriver?.regime === 'FREELANCER' && (
              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950">
                  Pacote Contratado (Free-lancer)
                </label>
                <select
                  value={contractedPackage}
                  onChange={e => setContractedPackage(e.target.value as ContractedPackage)}
                  className="w-full text-xs rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-slate-800"
                >
                  <option value="AUTO_MELHOR_TARIFA">Automático (4h se &lt;=6h, 8h se &gt;6h)</option>
                  <option value="PACOTE_4H">Pacote 4h Fixo (55€)</option>
                  <option value="PACOTE_8H">Pacote 8h Fixo (95€)</option>
                </select>
                <p className="text-[11px] text-emerald-800">
                  Apuramento automático de horas e refeição das 20h será calculado na conclusão.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {onNavigateToServices ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToServices();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <span>Abrir no Separador de Serviços</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedDriverId || !selectedVehicleId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Confirmar e Atualizar Escala
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

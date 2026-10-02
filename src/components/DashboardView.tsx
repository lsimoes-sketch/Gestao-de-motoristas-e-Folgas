import React, { useState } from 'react';
import {
  Users,
  Truck,
  CalendarCheck,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  HardDrive,
  CalendarX,
  UserX,
  Bell,
} from 'lucide-react';
import {
  Driver,
  Vehicle,
  TransportService,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
  FreelancerSettlement,
} from '../types';
import { getDriverDayStatus, checkDriverQualification } from '../utils/rulesEngine';
import { getOperationalAlerts } from '../utils/alertEngine';
import { DashboardAlertCenter } from './DashboardAlertCenter';
import { QuickAllocationModal } from './QuickAllocationModal';
import { DashboardCharts } from './DashboardCharts';

interface DashboardViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  services: TransportService[];
  allocations: Allocation[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  settlements: FreelancerSettlement[];
  onNavigate: (tab: any) => void;
  onOpenServiceModal: () => void;
  onOpenBackupModal?: () => void;
  onSaveAllocation?: (allocation: Allocation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drivers,
  vehicles,
  services,
  allocations,
  shiftScales,
  dayOffs,
  settlements,
  onNavigate,
  onOpenServiceModal,
  onOpenBackupModal,
  onSaveAllocation,
}) => {
  const currentDateStr = '2026-09-12';

  const [serviceToResolve, setServiceToResolve] = useState<TransportService | null>(null);

  const salariedDrivers = drivers.filter(d => d.regime === 'ASSALARIADO');
  const freelancerDrivers = drivers.filter(d => d.regime === 'FREELANCER');

  // Count salaried on day off today
  const salariedOnDayOffToday = salariedDrivers.filter(
    d => getDriverDayStatus(d.id, currentDateStr, dayOffs, shiftScales).isDayOff
  );

  // Compute operational alerts (unfilled scales, day-off clashes, missing scales, qualification issues)
  const alertsSummary = getOperationalAlerts(
    services,
    allocations,
    drivers,
    vehicles,
    shiftScales,
    dayOffs,
    currentDateStr
  );

  // Services scheduled for today
  const todayServices = services.filter(s => s.scheduledStart.startsWith(currentDateStr));
  const todayUnassignedCount = todayServices.filter(s => {
    const alloc = allocations.find(a => a.serviceId === s.id);
    return !alloc || !alloc.driverId || !alloc.vehicleId;
  }).length;

  const todayDayOffConflictCount = todayServices.filter(s => {
    const alloc = allocations.find(a => a.serviceId === s.id);
    if (!alloc?.driverId) return false;
    return getDriverDayStatus(alloc.driverId, currentDateStr, dayOffs, shiftScales).isDayOff;
  }).length;

  const handleQuickResolveService = (service: TransportService) => {
    if (onSaveAllocation) {
      setServiceToResolve(service);
    } else {
      onNavigate('services');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Painel Operacional</span>
            <span>•</span>
            <span>Data de Hoje: 12 de Setembro de 2026</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Controlo de Escalas, Folgas & Apuramento de Serviços
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Gestão integrada com isenção de horário e rotação para assalariados, controlo estrito de
            categoria (Ligeiros vs Pesados) e cálculo automático de pacotes para free-lancers.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-700 shadow-2xs"
              title="Cópia de Segurança do Sistema (JSON / CSV)"
            >
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Backup / Exportar</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('freelancer-calc')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-700"
          >
            <Calculator className="w-4 h-4" />
            <span>Simulador 4h/8h</span>
          </button>
          <button
            onClick={onOpenServiceModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>+ Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Assalariados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assalariados (IHT)
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{salariedDrivers.length}</span>
            <span className="text-xs text-slate-500">com isenção de horário</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>{salariedOnDayOffToday.length} em folga rotativa hoje</span>
          </div>
        </div>

        {/* Free-lancers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Free-lancers
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{freelancerDrivers.length}</span>
            <span className="text-xs text-slate-500">prestadores ativos</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Regras 4h / 8h + Refeição &gt; 20h</span>
          </div>
        </div>

        {/* Frota Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Frota de Veículos
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-slate-500">veículos registados</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
            <span>
              {vehicles.filter(v => v.category === 'LIGEIROS').length} Ligeiros •{' '}
              {vehicles.filter(v => v.category === 'PESADOS_PASSAGEIROS').length} Pesados
            </span>
          </div>
        </div>

        {/* Serviços de Hoje & Estado da Escala */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Serviços Hoje (12/09)
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                todayDayOffConflictCount > 0
                  ? 'bg-rose-50 text-rose-600'
                  : todayUnassignedCount > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {todayDayOffConflictCount > 0 ? (
                <CalendarX className="w-5 h-5 text-rose-600" />
              ) : todayUnassignedCount > 0 ? (
                <UserX className="w-5 h-5 text-amber-600" />
              ) : (
                <CalendarCheck className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{todayServices.length}</span>
            <span className="text-xs text-slate-500">transfers e tours</span>
          </div>
          <div className="mt-2 text-xs">
            {todayDayOffConflictCount > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {todayDayOffConflictCount} serviço com motorista em folga!
              </span>
            ) : todayUnassignedCount > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {todayUnassignedCount} serviço por preencher
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% alocado e em escala
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sistema de Notificações & Alertas Visuais de Escala & Folgas */}
      <DashboardAlertCenter
        alertsSummary={alertsSummary}
        onNavigate={onNavigate}
        onQuickResolveService={handleQuickResolveService}
      />

      {/* Grid: Serviços de Hoje & Mapa de Folgas Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Serviços de Hoje */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Programação de Hoje (12 de Setembro)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('services')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Ver todos os serviços</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {todayServices.map(service => {
              const alloc = allocations.find(a => a.serviceId === service.id);
              const driver = alloc ? drivers.find(d => d.id === alloc.driverId) : null;
              const vehicle = alloc ? vehicles.find(v => v.id === alloc.vehicleId) : null;

              const startTime = service.scheduledStart.split('T')[1];
              const endTime = service.scheduledEnd.split('T')[1];

              // Check Day Off Conflict for today
              const dayOffStatus = driver
                ? getDriverDayStatus(driver.id, currentDateStr, dayOffs, shiftScales)
                : null;
              const hasDayOffConflict = dayOffStatus?.isDayOff;

              // Check Qualification
              const qual = driver ? checkDriverQualification(driver, service) : null;
              const hasQualConflict = qual && !qual.allowed;

              // Check Unassigned
              const isUnassigned = !driver || !vehicle;

              return (
                <div
                  key={service.id}
                  className={`p-4 transition-colors ${
                    hasDayOffConflict
                      ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-600'
                      : isUnassigned
                      ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {service.code}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          service.requiredCategory === 'PESADOS_PASSAGEIROS'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {service.requiredCategory === 'PESADOS_PASSAGEIROS'
                          ? 'Pesados de Passageiros'
                          : 'Ligeiros'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {startTime} - {endTime}
                      </span>

                      {/* Explicit Visual Conflict Tags */}
                      {hasDayOffConflict && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white animate-pulse">
                          <CalendarX className="w-3 h-3" />
                          MOTORISTA EM FOLGA
                        </span>
                      )}

                      {isUnassigned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-600 text-white">
                          <UserX className="w-3 h-3" />
                          ESCALA NÃO PREENCHIDA
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-slate-600">
                      {service.clientName}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{service.origin}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span>{service.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {driver ? (
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                            hasDayOffConflict
                              ? 'bg-rose-100 text-rose-900 border border-rose-200 font-bold'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              hasDayOffConflict ? 'bg-rose-600' : 'bg-emerald-500'
                            }`}
                          ></span>
                          {driver.name} ({driver.regime === 'ASSALARIADO' ? 'IHT' : 'FL'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md border border-amber-200 flex items-center gap-1">
                          <UserX className="w-3 h-3 text-amber-700" />
                          Sem Motorista
                        </span>
                      )}

                      {vehicle ? (
                        <span className="text-slate-500 font-mono">[{vehicle.plate}]</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md border border-amber-200 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-amber-700" />
                          Sem Viatura
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Action & Warning Banner for Day-Off Conflict */}
                  {hasDayOffConflict && (
                    <div className="mt-3 p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-950">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
                        <span>
                          <strong>Conflito Operacional:</strong> {driver?.name} está registado em{' '}
                          <strong>{dayOffStatus?.label}</strong> no dia de hoje.
                        </span>
                      </div>
                      <button
                        onClick={() => handleQuickResolveService(service)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors self-end sm:self-auto shrink-0 shadow-2xs flex items-center gap-1.5"
                      >
                        <span>Substituir Motorista</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Inline Action & Warning Banner for Unassigned Service */}
                  {isUnassigned && (
                    <div className="mt-3 p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          <strong>Ação Necessária:</strong> Este serviço necessita de{' '}
                          <strong>{!driver ? 'motorista' : ''}</strong>
                          {!driver && !vehicle ? ' e ' : ''}
                          <strong>{!vehicle ? 'viatura' : ''}</strong> para poder ser realizado hoje.
                        </span>
                      </div>
                      <button
                        onClick={() => handleQuickResolveService(service)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-colors self-end sm:self-auto shrink-0 shadow-2xs flex items-center gap-1.5"
                      >
                        <span>Preencher Escala</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Inline Action & Warning Banner for Category Mismatch */}
                  {hasQualConflict && (
                    <div className="mt-3 p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          <strong>Incompatibilidade:</strong> {qual?.reason}
                        </span>
                      </div>
                      <button
                        onClick={() => handleQuickResolveService(service)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition-colors self-end sm:self-auto shrink-0 shadow-2xs flex items-center gap-1.5"
                      >
                        <span>Trocar para Motorista CAM</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Estado das Folgas dos Assalariados */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">Escala de Assalariados (Hoje)</h2>
            </div>
            <button
              onClick={() => onNavigate('roster')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <span>Mapa mensal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {salariedDrivers.map(driver => {
              const status = getDriverDayStatus(driver.id, currentDateStr, dayOffs, shiftScales);
              return (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{driver.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-200 text-slate-700 font-mono">
                        {driver.mechanicalNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {driver.category === 'MISTO_PESADOS' ? 'Ligeiros + Pesados (CAM)' : 'Apenas Ligeiros'}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      status.isDayOff
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
            Regime de Isenção de Horário (IHT): Folgas geradas pelo ciclo de rotação (6x2 / 5x2) com
            bloqueio de alocação de serviços.
          </div>
        </div>
      </div>

      {/* Visualizações em Gráficos Recharts: Distribuição por Tipo e Volume Mensal de Horas */}
      <DashboardCharts
        services={services}
        allocations={allocations}
        drivers={drivers}
      />

      {/* Quick Allocation Modal triggered from alerts */}
      {serviceToResolve && (
        <QuickAllocationModal
          isOpen={!!serviceToResolve}
          service={serviceToResolve}
          drivers={drivers}
          vehicles={vehicles}
          allocations={allocations}
          shiftScales={shiftScales}
          dayOffs={dayOffs}
          allServices={services}
          onClose={() => setServiceToResolve(null)}
          onSaveAllocation={alloc => {
            if (onSaveAllocation) {
              onSaveAllocation(alloc);
            }
            setServiceToResolve(null);
          }}
          onNavigateToServices={() => {
            setServiceToResolve(null);
            onNavigate('services');
          }}
        />
      )}
    </div>
  );
};

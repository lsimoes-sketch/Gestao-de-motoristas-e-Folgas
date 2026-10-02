import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ServicesView } from './components/ServicesView';
import { RosterView } from './components/RosterView';
import { FreelancerCalcView } from './components/FreelancerCalcView';
import { DriversFleetView } from './components/DriversFleetView';
import { ArchitectureView } from './components/ArchitectureView';
import { NewServiceModal } from './components/NewServiceModal';
import { SystemBackupModal } from './components/SystemBackupModal';
import { SystemBackupData } from './utils/systemBackup';
import { getOperationalAlerts } from './utils/alertEngine';
import { getTodayStr, getNowLocalStr } from './utils/dates';
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  saveAllToStorage,
  getLastSavedTimestamp,
} from './utils/storage';
import {
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_SERVICES,
  INITIAL_ALLOCATIONS,
  INITIAL_SHIFT_SCALES,
  INITIAL_DAY_OFFS,
  INITIAL_SETTLEMENTS,
} from './data/mockData';
import {
  Driver,
  Vehicle,
  TransportService,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
  FreelancerSettlement,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Application Data States initialized with persistent local storage
  const [drivers, setDrivers] = useState<Driver[]>(() =>
    loadFromStorage<Driver[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS)
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    loadFromStorage<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES)
  );
  const [services, setServices] = useState<TransportService[]>(() =>
    loadFromStorage<TransportService[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES)
  );
  const [allocations, setAllocations] = useState<Allocation[]>(() =>
    loadFromStorage<Allocation[]>(STORAGE_KEYS.ALLOCATIONS, INITIAL_ALLOCATIONS)
  );
  const [shiftScales, setShiftScales] = useState<ShiftScaleConfig[]>(() =>
    loadFromStorage<ShiftScaleConfig[]>(STORAGE_KEYS.SHIFT_SCALES, INITIAL_SHIFT_SCALES)
  );
  const [dayOffs, setDayOffs] = useState<DayOffRecord[]>(() =>
    loadFromStorage<DayOffRecord[]>(STORAGE_KEYS.DAY_OFFS, INITIAL_DAY_OFFS)
  );
  const [settlements, setSettlements] = useState<FreelancerSettlement[]>(() =>
    loadFromStorage<FreelancerSettlement[]>(STORAGE_KEYS.SETTLEMENTS, INITIAL_SETTLEMENTS)
  );

  // =========================================================================
  // Periodic Debounced Auto-Save Engine (30-second interval / debounce)
  // Automatically persists all states to localStorage in production
  // =========================================================================
  const AUTO_SAVE_INTERVAL_MS = 30000;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    const raw = getLastSavedTimestamp();
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return null;
    }
  });

  // Keep latest states in a ref to avoid stale closures in timeouts and window events
  const payloadRef = useRef({
    drivers,
    vehicles,
    services,
    allocations,
    shiftScales,
    dayOffs,
    settlements,
  });

  useEffect(() => {
    payloadRef.current = {
      drivers,
      vehicles,
      services,
      allocations,
      shiftScales,
      dayOffs,
      settlements,
    };
  }, [drivers, vehicles, services, allocations, shiftScales, dayOffs, settlements]);

  const hasUnsavedChangesRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Core save function: saves all states to localStorage at once
  const saveAllNow = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsSaving(true);
    const success = saveAllToStorage(payloadRef.current);

    if (success) {
      hasUnsavedChangesRef.current = false;
      setHasUnsavedChanges(false);
      const timeStr = new Date().toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSavedTime(timeStr);
    }

    setTimeout(() => {
      setIsSaving(false);
    }, 600);

    return success;
  }, []);

  // Monitor changes across all states to trigger debounced auto-save (30s)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    hasUnsavedChangesRef.current = true;
    setHasUnsavedChanges(true);

    // Reset 30s debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        saveAllNow();
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    drivers,
    vehicles,
    services,
    allocations,
    shiftScales,
    dayOffs,
    settlements,
    saveAllNow,
  ]);

  // Periodic safety check: every 30 seconds, persist if there are pending unsaved changes
  useEffect(() => {
    const periodicInterval = setInterval(() => {
      if (hasUnsavedChangesRef.current) {
        saveAllNow();
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(periodicInterval);
  }, [saveAllNow]);

  // Flush pending changes synchronously on tab close, refresh or backgrounding
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChangesRef.current) {
        saveAllToStorage(payloadRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChangesRef.current) {
        saveAllToStorage(payloadRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Handlers
  const handleRestoreBackup = (backup: SystemBackupData) => {
    if (backup.drivers && Array.isArray(backup.drivers)) {
      setDrivers(backup.drivers);
    }
    if (backup.vehicles && Array.isArray(backup.vehicles)) {
      setVehicles(backup.vehicles);
    }
    if (backup.services && Array.isArray(backup.services)) {
      setServices(backup.services);
    }
    if (backup.allocations && Array.isArray(backup.allocations)) {
      setAllocations(backup.allocations);
    }
    if (backup.shiftScales && Array.isArray(backup.shiftScales)) {
      setShiftScales(backup.shiftScales);
    }
    if (backup.dayOffs && Array.isArray(backup.dayOffs)) {
      setDayOffs(backup.dayOffs);
    }
    if (backup.settlements && Array.isArray(backup.settlements)) {
      setSettlements(backup.settlements);
    }
  };

  const handleSaveAllocation = (newAlloc: Allocation) => {
    setAllocations(prev => {
      const exists = prev.some(a => a.serviceId === newAlloc.serviceId);
      if (exists) {
        return prev.map(a => (a.serviceId === newAlloc.serviceId ? newAlloc : a));
      }
      return [...prev, newAlloc];
    });

    // Update service status to CONFIRMADO
    setServices(prev =>
      prev.map(s => (s.id === newAlloc.serviceId ? { ...s, status: 'CONFIRMADO' } : s))
    );
  };

  const handleCompleteServiceAndSettle = (settlement: FreelancerSettlement) => {
    setSettlements(prev => [settlement, ...prev]);

    // Find service and update status to CONCLUIDO (serviço e alocação)
    const alloc = allocations.find(a => a.id === settlement.allocationId);
    if (alloc) {
      setServices(prev =>
        prev.map(s => (s.id === alloc.serviceId ? { ...s, status: 'CONCLUIDO' } : s))
      );
      setAllocations(prev =>
        prev.map(a => (a.id === alloc.id ? { ...a, status: 'CONCLUIDO' } : a))
      );
    }
  };

  /**
   * Fecha um ou mais serviços (concluído ou cancelado), mantendo a alocação coerente.
   * Usado para serviços que já terminaram mas ficaram com estado desatualizado.
   */
  const handleSetServicesStatus = (
    serviceIds: string[],
    status: 'CONCLUIDO' | 'CANCELADO'
  ) => {
    if (serviceIds.length === 0) return;
    const ids = new Set(serviceIds);
    setServices(prev => prev.map(s => (ids.has(s.id) ? { ...s, status } : s)));
    setAllocations(prev =>
      prev.map(a => (ids.has(a.serviceId) ? { ...a, status } : a))
    );
  };

  const handleAddDriver = (newDriver: Driver) => {
    setDrivers(prev => {
      const updated = [newDriver, ...prev];
      saveToStorage(STORAGE_KEYS.DRIVERS, updated);
      return updated;
    });
    if (newDriver.regime === 'ASSALARIADO') {
      const newScale: ShiftScaleConfig = {
        id: `sc-${Date.now()}`,
        driverId: newDriver.id,
        cycleType: 'MENSAL_FDS_ALTERNADO',
        anchorDate: '2026-09-01',
        workDays: 5,
        offDays: 2,
        weekendOffPattern: 'SEMANAS_IMPARES',
        weekdayOffDays: [2, 3],
      };
      setShiftScales(prev => {
        const updated = [...prev, newScale];
        saveToStorage(STORAGE_KEYS.SHIFT_SCALES, updated);
        return updated;
      });
    }
  };

  const handleUpdateDriver = (updatedDriver: Driver) => {
    setDrivers(prev => {
      const updated = prev.map(d => (d.id === updatedDriver.id ? updatedDriver : d));
      saveToStorage(STORAGE_KEYS.DRIVERS, updated);
      return updated;
    });
  };

  const handleDeleteDriver = (driverId: string) => {
    setDrivers(prev => {
      const updated = prev.filter(d => d.id !== driverId);
      saveToStorage(STORAGE_KEYS.DRIVERS, updated);
      return updated;
    });
    setShiftScales(prev => prev.filter(s => s.driverId !== driverId));
    setDayOffs(prev => prev.filter(d => d.driverId !== driverId));
  };

  const handleManualSaveDrivers = () => {
    return saveAllNow();
  };

  const handleResetDriversToDefault = () => {
    setDrivers(INITIAL_DRIVERS);
    saveToStorage(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  };

  const handleAddVehicle = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      const updated = [newVehicle, ...prev];
      return updated;
    });
  };

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setVehicles(prev => {
      const updated = prev.map(v => (v.id === updatedVehicle.id ? updatedVehicle : v));
      return updated;
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles(prev => {
      const updated = prev.filter(v => v.id !== vehicleId);
      return updated;
    });
    setAllocations(prev => prev.filter(a => a.vehicleId !== vehicleId));
  };

  const handleManualSaveVehicles = () => {
    return saveAllNow();
  };

  const handleResetVehiclesToDefault = () => {
    setVehicles(INITIAL_VEHICLES);
    saveToStorage(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  };

  const handleAddService = (newService: TransportService) => {
    setServices(prev => [newService, ...prev]);
  };

  const handleBatchAddServices = (newServices: TransportService[]) => {
    setServices(prev => [...newServices, ...prev]);
  };

  const handleToggleDayOff = (
    driverId: string,
    date: string,
    type: 'FERIAS' | 'BAIXA_MEDICA' | 'FOLGA_ROTATIVA'
  ) => {
    setDayOffs(prev => {
      const existingIndex = prev.findIndex(d => d.driverId === driverId && d.date === date);
      if (existingIndex >= 0) {
        // Remove or update
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return updated;
      } else {
        const newRecord: DayOffRecord = {
          id: `do-${Date.now()}`,
          driverId,
          date,
          type,
          isAutomatic: false,
          blocked: true,
          notes: `Ajuste manual de ${type.toLowerCase().replace(/_/g, ' ')}`,
        };
        return [...prev, newRecord];
      }
    });
  };

  const handleUpdateScale = (updatedScale: ShiftScaleConfig) => {
    setShiftScales(prev =>
      prev.map(s => (s.driverId === updatedScale.driverId ? updatedScale : s))
    );
  };

  // Compute live operational alerts for unfilled scales and day-off conflicts
  const alertsSummary = getOperationalAlerts(
    services,
    allocations,
    drivers,
    vehicles,
    shiftScales,
    dayOffs,
    getTodayStr(),
    getNowLocalStr()
  );

  // Count services waiting for allocation (apenas serviços em aberto que ainda não terminaram)
  const nowLocal = getNowLocalStr();
  const pendingCount = services.filter(
    s =>
      s.status !== 'CONCLUIDO' &&
      s.status !== 'CANCELADO' &&
      s.scheduledEnd >= nowLocal &&
      !allocations.some(a => a.serviceId === s.id && a.status !== 'CANCELADO')
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingServicesCount={pendingCount}
        alertsCount={alertsSummary.alerts.length}
        criticalAlertsCount={alertsSummary.criticalCount}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        autoSaveInfo={{
          isSaving,
          hasUnsavedChanges,
          lastSavedTime,
          onSaveNow: saveAllNow,
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            drivers={drivers}
            vehicles={vehicles}
            services={services}
            allocations={allocations}
            shiftScales={shiftScales}
            dayOffs={dayOffs}
            settlements={settlements}
            onNavigate={setActiveTab}
            onOpenServiceModal={() => setIsNewServiceModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onSaveAllocation={handleSaveAllocation}
          />
        )}

        {activeTab === 'services' && (
          <ServicesView
            services={services}
            drivers={drivers}
            vehicles={vehicles}
            allocations={allocations}
            shiftScales={shiftScales}
            dayOffs={dayOffs}
            onSaveAllocation={handleSaveAllocation}
            onCompleteServiceAndSettle={handleCompleteServiceAndSettle}
            onSetServicesStatus={handleSetServicesStatus}
            onOpenNewServiceModal={() => setIsNewServiceModalOpen(true)}
            onBatchAddServices={handleBatchAddServices}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        )}

        {activeTab === 'roster' && (
          <RosterView
            drivers={drivers}
            shiftScales={shiftScales}
            dayOffs={dayOffs}
            onToggleDayOff={handleToggleDayOff}
            onUpdateScale={handleUpdateScale}
          />
        )}

        {activeTab === 'freelancer-calc' && (
          <FreelancerCalcView settlements={settlements} drivers={drivers} services={services} />
        )}

        {activeTab === 'drivers-fleet' && (
          <DriversFleetView
            drivers={drivers}
            vehicles={vehicles}
            allocations={allocations}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onDeleteDriver={handleDeleteDriver}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onManualSaveDrivers={handleManualSaveDrivers}
            onManualSaveVehicles={handleManualSaveVehicles}
            onResetDrivers={handleResetDriversToDefault}
            onResetVehicles={handleResetVehiclesToDefault}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Global New Service Modal */}
      <NewServiceModal
        isOpen={isNewServiceModalOpen}
        onClose={() => setIsNewServiceModalOpen(false)}
        onAddService={handleAddService}
      />

      {/* Global System Backup & Data Export Modal */}
      <SystemBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        drivers={drivers}
        vehicles={vehicles}
        services={services}
        allocations={allocations}
        shiftScales={shiftScales}
        dayOffs={dayOffs}
        settlements={settlements}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <strong>Transfers & Tours Ops</strong> • Sistema de Gestão de Horários, Escalas e
            Apuramentos
          </div>
          <div className="flex items-center gap-4">
            <span>Regimes: Assalariados (IHT) & Free-lancers (4h/8h)</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('architecture')}
              className="text-blue-600 hover:underline font-semibold"
            >
              Consultar Modelo ER
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

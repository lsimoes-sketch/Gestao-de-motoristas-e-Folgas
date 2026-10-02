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
  setLocalPersistenceEnabled,
} from './utils/storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSharedMode } from './lib/supabase';
import {
  loadAll,
  pushChanges,
  subscribeToChanges,
  emptySnapshot,
  stableStringify,
  SyncedSnapshot,
  RemoteChange,
} from './lib/sharedStore';
import { LoginScreen } from './components/LoginScreen';
import { TeamAccessModal } from './components/TeamAccessModal';
import { ImportAgendaModal } from './components/ImportAgendaModal';
import { ShiftsView } from './components/ShiftsView';
import { getDayShifts, workDayId } from './utils/shiftRules';
import type { AgendaImportResult } from './utils/agendaImport';
import { Loader2, ShieldX } from 'lucide-react';
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
  WorkDayRecord,
} from './types';

// Com a base partilhada ativa, nada é guardado no browser
setLocalPersistenceEnabled(!isSharedMode);

/** Estado inicial: no modo partilhado começa vazio (os dados vêm da base de dados). */
function initialState<T>(key: string, fallback: T[]): T[] {
  return isSharedMode ? [] : loadFromStorage<T[]>(key, fallback);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // =========================================================================
  // Base de dados partilhada (Supabase): sessão, carregamento e sincronização
  // =========================================================================
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSharedMode);
  const [dataStatus, setDataStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'error'>(
    isSharedMode ? 'idle' : 'ready'
  );
  const [dataError, setDataError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const snapshotRef = useRef<SyncedSnapshot>(emptySnapshot());
  const pushInFlightRef = useRef(false);
  const pushAgainRef = useRef(false);
  // Só se grava na base de dados depois de os dados estarem totalmente carregados
  const sharedReadyRef = useRef(false);

  // Application Data States initialized with persistent local storage
  const [drivers, setDrivers] = useState<Driver[]>(() =>
    initialState<Driver>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS)
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    initialState<Vehicle>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES)
  );
  const [services, setServices] = useState<TransportService[]>(() =>
    initialState<TransportService>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES)
  );
  const [allocations, setAllocations] = useState<Allocation[]>(() =>
    initialState<Allocation>(STORAGE_KEYS.ALLOCATIONS, INITIAL_ALLOCATIONS)
  );
  const [shiftScales, setShiftScales] = useState<ShiftScaleConfig[]>(() =>
    initialState<ShiftScaleConfig>(STORAGE_KEYS.SHIFT_SCALES, INITIAL_SHIFT_SCALES)
  );
  const [dayOffs, setDayOffs] = useState<DayOffRecord[]>(() =>
    initialState<DayOffRecord>(STORAGE_KEYS.DAY_OFFS, INITIAL_DAY_OFFS)
  );
  const [settlements, setSettlements] = useState<FreelancerSettlement[]>(() =>
    initialState<FreelancerSettlement>(STORAGE_KEYS.SETTLEMENTS, INITIAL_SETTLEMENTS)
  );
  const [workDays, setWorkDays] = useState<WorkDayRecord[]>(() =>
    initialState<WorkDayRecord>(STORAGE_KEYS.WORK_DAYS, [])
  );

  // =========================================================================
  // Periodic Debounced Auto-Save Engine (30-second interval / debounce)
  // Automatically persists all states to localStorage in production
  // =========================================================================
  // Local: grava a cada 30s. Partilhado: envia para a base de dados ~1s após cada alteração.
  const AUTO_SAVE_INTERVAL_MS = isSharedMode ? 1000 : 30000;

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
    workDays,
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
      workDays,
    };
  }, [drivers, vehicles, services, allocations, shiftScales, dayOffs, settlements, workDays]);

  const hasUnsavedChangesRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Envia as diferenças para a base de dados partilhada (uma operação de cada vez)
  const runSharedPush = useCallback(async () => {
    if (!isSharedMode || !sharedReadyRef.current) return;
    if (pushInFlightRef.current) {
      pushAgainRef.current = true;
      return;
    }
    pushInFlightRef.current = true;
    setIsSaving(true);
    try {
      do {
        pushAgainRef.current = false;
        await pushChanges(payloadRef.current, snapshotRef.current);
      } while (pushAgainRef.current);
      hasUnsavedChangesRef.current = false;
      setHasUnsavedChanges(false);
      setSyncError(null);
      setLastSavedTime(
        new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err: any) {
      console.error('[Sync] Falha ao gravar na base de dados:', err);
      setSyncError(err?.message || 'Erro desconhecido ao gravar.');
    } finally {
      pushInFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  // Core save function: saves all states to localStorage at once
  const saveAllNow = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (isSharedMode) {
      runSharedPush();
      return true;
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
    workDays,
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
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        if (isSharedMode) {
          // Ainda há alterações a caminho da base de dados: pedir confirmação
          e.preventDefault();
          e.returnValue = '';
          return;
        }
        saveAllToStorage(payloadRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChangesRef.current) {
        if (isSharedMode) runSharedPush();
        else saveAllToStorage(payloadRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Modo partilhado: sessão de login
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isSharedMode || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  type CollectionSetter = React.Dispatch<React.SetStateAction<any[]>>;
  const collectionSetters: Record<keyof typeof payloadRef.current, CollectionSetter> = {
    drivers: setDrivers,
    vehicles: setVehicles,
    services: setServices,
    allocations: setAllocations,
    shiftScales: setShiftScales,
    dayOffs: setDayOffs,
    settlements: setSettlements,
    workDays: setWorkDays,
  };
  const settersRef = useRef(collectionSetters);
  settersRef.current = collectionSetters;

  const userId = session?.user?.id;

  // Carregar os dados da base partilhada depois do login
  const loadSharedData = useCallback(async () => {
    if (!isSharedMode || !supabase) return;
    sharedReadyRef.current = false;
    setDataStatus('loading');
    setDataError(null);
    try {
      const { data: isMember, error: memberError } = await supabase.rpc('is_team_member');
      if (memberError) throw memberError;
      if (!isMember) {
        setDataStatus('denied');
        return;
      }
      const { payload, snapshot } = await loadAll();
      // Estado e snapshot passam a coincidir no mesmo instante (nada a gravar)
      payloadRef.current = payload;
      snapshotRef.current = snapshot;
      setDrivers(payload.drivers);
      setVehicles(payload.vehicles);
      setServices(payload.services);
      setAllocations(payload.allocations);
      setShiftScales(payload.shiftScales);
      setDayOffs(payload.dayOffs);
      setSettlements(payload.settlements);
      setWorkDays(payload.workDays || []);
      sharedReadyRef.current = true;
      setDataStatus('ready');
    } catch (err: any) {
      console.error('[Sync] Falha ao carregar dados:', err);
      setDataError(err?.message || 'Erro desconhecido.');
      setDataStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isSharedMode) return;
    if (userId) {
      loadSharedData();
    } else {
      // Sem sessão: limpar tudo da memória
      sharedReadyRef.current = false;
      snapshotRef.current = emptySnapshot();
      (Object.values(settersRef.current) as CollectionSetter[]).forEach(set => set([]));
      setDataStatus('idle');
    }
  }, [userId, loadSharedData]);

  // Receber em tempo real as alterações feitas por outros membros da equipa
  useEffect(() => {
    if (!isSharedMode || dataStatus !== 'ready') return;

    const applyRemote = (change: RemoteChange) => {
      const synced = snapshotRef.current[change.key];
      const current = (payloadRef.current[change.key] as { id: string }[]).find(i => i.id === change.id);
      const syncedJson = synced.get(change.id);
      // Se este registo tem alterações locais ainda por gravar, a versão local prevalece
      const hasLocalPending = current ? stableStringify(current) !== syncedJson : syncedJson !== undefined;

      if (change.type === 'DELETE') {
        synced.delete(change.id);
        if (!hasLocalPending || !current) {
          settersRef.current[change.key](prev => prev.filter((i: any) => i.id !== change.id));
        }
        return;
      }

      const remoteJson = stableStringify(change.data);
      if (remoteJson === syncedJson) return; // eco da nossa própria gravação
      if (hasLocalPending && current && stableStringify(current) !== remoteJson) return;

      synced.set(change.id, remoteJson);
      settersRef.current[change.key](prev => {
        const exists = prev.some((i: any) => i.id === change.id);
        return exists ? prev.map((i: any) => (i.id === change.id ? change.data : i)) : [change.data, ...prev];
      });
    };

    const unsubscribe = subscribeToChanges(applyRemote, status => setIsLive(status === 'SUBSCRIBED'));
    return () => {
      unsubscribe();
      setIsLive(false);
    };
  }, [dataStatus]);

  const handleSignOut = async () => {
    if (hasUnsavedChangesRef.current) {
      await runSharedPush();
    }
    await supabase?.auth.signOut();
  };

  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [isAgendaImportOpen, setIsAgendaImportOpen] = useState(false);

  /**
   * Junta os dados importados da Agenda: atualiza por ID (sem duplicar),
   * acrescenta fichas/viaturas novas e guarda nomes alternativos dos motoristas.
   */
  const handleImportAgenda = (result: AgendaImportResult) => {
    const upsert = <T extends { id: string }>(prev: T[], items: T[]) => {
      const byId = new Map(items.map(i => [i.id, i]));
      const updated = prev.map(p => byId.get(p.id) ?? p);
      const existing = new Set(prev.map(p => p.id));
      return [...items.filter(i => !existing.has(i.id)), ...updated];
    };

    setDrivers(prev => {
      let next = prev.map(d => {
        const aliases = result.aliasUpdates[d.id];
        if (!aliases?.length) return d;
        return { ...d, agendaAliases: [...new Set([...(d.agendaAliases || []), ...aliases])] };
      });
      next = upsert(next, result.newDrivers);
      saveToStorage(STORAGE_KEYS.DRIVERS, next);
      return next;
    });
    if (result.newVehicles.length) setVehicles(prev => upsert(prev, result.newVehicles));
    setServices(prev => upsert(prev, result.services));
    setAllocations(prev => {
      const importedServiceIds = new Set(result.allocations.map(a => a.serviceId));
      const importedIds = new Set(result.allocations.map(a => a.id));
      // Uma alocação por serviço: a da agenda substitui outra que exista para o mesmo serviço
      const kept = prev.filter(a => !(importedServiceIds.has(a.serviceId) && !importedIds.has(a.id)));
      return upsert(kept, result.allocations);
    });
  };
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

  /** Início/fim de jornada manual (exceção) de um motorista num dia; null repõe a regra */
  const handleSetShiftOverride = (driverId: string, date: string, edge: 'start' | 'end', value: string | null) => {
    const id = workDayId(driverId, date);
    const field = edge === 'start' ? 'startOverride' : 'endOverride';
    setWorkDays(prev => {
      const existing = prev.find(w => w.id === id);
      const audit = { updatedAt: new Date().toISOString(), ...(session?.user?.email ? { updatedBy: session.user.email } : {}) };
      if (value === null) {
        if (!existing) return prev;
        const cleaned: WorkDayRecord = { ...existing, ...audit };
        delete cleaned[field];
        // Sem nenhuma exceção guardada, o registo deixa de ser necessário
        const empty = !cleaned.startOverride && !cleaned.endOverride && !cleaned.note;
        return empty ? prev.filter(w => w.id !== id) : prev.map(w => (w.id === id ? cleaned : w));
      }
      const record: WorkDayRecord = { ...(existing || { id, driverId, date }), [field]: value, ...audit };
      return existing ? prev.map(w => (w.id === id ? record : w)) : [...prev, record];
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

  // Jornadas de hoje com início ou fim ainda por inserir à mão
  const pendingShiftStartsToday = getDayShifts(getTodayStr(), services, allocations, drivers, workDays).filter(
    s => s.startSource === 'PENDENTE' || s.endSource === 'PENDENTE'
  ).length;

  // Count services waiting for allocation (apenas serviços em aberto que ainda não terminaram)
  const nowLocal = getNowLocalStr();
  const pendingCount = services.filter(
    s =>
      s.status !== 'CONCLUIDO' &&
      s.status !== 'CANCELADO' &&
      s.scheduledEnd >= nowLocal &&
      !allocations.some(a => a.serviceId === s.id && a.status !== 'CANCELADO')
  ).length;

  // ---------------------------------------------------------------------
  // Ecrãs do modo partilhado (antes de os dados estarem disponíveis)
  // ---------------------------------------------------------------------
  if (isSharedMode) {
    const centered = (content: React.ReactNode) => (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">{content}</div>
    );

    if (!authReady) {
      return centered(<Loader2 className="w-6 h-6 animate-spin text-slate-400" />);
    }
    if (!session) {
      return <LoginScreen />;
    }
    if (dataStatus === 'denied') {
      return centered(
        <div className="max-w-md bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 shadow-xs">
          <ShieldX className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Sem acesso aos dados</h2>
          <p className="text-sm text-slate-600">
            Entrou como <strong>{session.user.email}</strong>, mas este email não está na lista da equipa.
            Peça a um colega para o adicionar em "Equipa".
          </p>
          <button
            onClick={() => supabase?.auth.signOut()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold"
          >
            Sair e usar outro email
          </button>
        </div>
      );
    }
    if (dataStatus === 'error') {
      return centered(
        <div className="max-w-md bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Não foi possível carregar os dados</h2>
          <p className="text-xs text-slate-500 break-words">{dataError}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={loadSharedData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
            >
              Tentar de novo
            </button>
            <button
              onClick={() => supabase?.auth.signOut()}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-sm font-bold"
            >
              Sair
            </button>
          </div>
        </div>
      );
    }
    if (dataStatus !== 'ready') {
      return centered(
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />A carregar os dados da equipa…
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingServicesCount={pendingCount}
        pendingShiftStartsCount={pendingShiftStartsToday}
        alertsCount={alertsSummary.alerts.length}
        criticalAlertsCount={alertsSummary.criticalCount}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        autoSaveInfo={{
          isSaving,
          hasUnsavedChanges,
          lastSavedTime,
          onSaveNow: saveAllNow,
        }}
        sharedSession={
          isSharedMode && session
            ? {
                email: session.user.email || '',
                onSignOut: handleSignOut,
                onOpenTeam: () => setIsTeamModalOpen(true),
                syncError,
                isLive,
              }
            : undefined
        }
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
            onOpenAgendaImport={() => setIsAgendaImportOpen(true)}
            onBatchAddServices={handleBatchAddServices}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftsView
            drivers={drivers}
            services={services}
            allocations={allocations}
            workDays={workDays}
            onSetOverride={handleSetShiftOverride}
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
            // Repor os dados de exemplo não faz sentido (e seria perigoso) na base partilhada
            onResetDrivers={isSharedMode ? undefined : handleResetDriversToDefault}
            onResetVehicles={isSharedMode ? undefined : handleResetVehiclesToDefault}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      <ImportAgendaModal
        isOpen={isAgendaImportOpen}
        onClose={() => setIsAgendaImportOpen(false)}
        drivers={drivers}
        vehicles={vehicles}
        allocations={allocations}
        onImport={handleImportAgenda}
      />

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

      {isSharedMode && session && (
        <TeamAccessModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          currentEmail={session.user.email || ''}
        />
      )}

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

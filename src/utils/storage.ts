import {
  Driver,
  Vehicle,
  TransportService,
  Allocation,
  ShiftScaleConfig,
  DayOffRecord,
  FreelancerSettlement,
} from '../types';

export const STORAGE_KEYS = {
  DRIVERS: 'transfers_ops_drivers_v2',
  VEHICLES: 'transfers_ops_vehicles_v2',
  SERVICES: 'transfers_ops_services_v2',
  ALLOCATIONS: 'transfers_ops_allocations_v2',
  SHIFT_SCALES: 'transfers_ops_shift_scales_v2',
  DAY_OFFS: 'transfers_ops_day_offs_v2',
  SETTLEMENTS: 'transfers_ops_settlements_v2',
  LAST_SAVED: 'transfers_ops_last_saved_v2',
};

/**
 * Safely loads data from localStorage with fallback
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`[Storage] Erro ao ler "${key}" do localStorage:`, err);
    return fallback;
  }
}

/**
 * Com a base de dados partilhada ativa, os dados NÃO são guardados no browser
 * (evita cópias de dados pessoais dos motoristas em computadores partilhados).
 */
let localPersistenceEnabled = true;
export function setLocalPersistenceEnabled(enabled: boolean) {
  localPersistenceEnabled = enabled;
}

/**
 * Safely saves data to localStorage
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  if (!localPersistenceEnabled) return true;
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    window.localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
    return true;
  } catch (err) {
    console.error(`[Storage] Erro ao gravar "${key}" no localStorage:`, err);
    return false;
  }
}

export interface AppStoragePayload {
  drivers: Driver[];
  vehicles: Vehicle[];
  services: TransportService[];
  allocations: Allocation[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  settlements: FreelancerSettlement[];
}

/**
 * Safely saves all application states to localStorage in a single batch
 */
export function saveAllToStorage(payload: AppStoragePayload): boolean {
  if (!localPersistenceEnabled) return true;
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(payload.drivers));
    window.localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(payload.vehicles));
    window.localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(payload.services));
    window.localStorage.setItem(STORAGE_KEYS.ALLOCATIONS, JSON.stringify(payload.allocations));
    window.localStorage.setItem(STORAGE_KEYS.SHIFT_SCALES, JSON.stringify(payload.shiftScales));
    window.localStorage.setItem(STORAGE_KEYS.DAY_OFFS, JSON.stringify(payload.dayOffs));
    window.localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(payload.settlements));
    window.localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
    return true;
  } catch (err) {
    console.error('[Storage] Erro ao gravar todos os estados no localStorage:', err);
    return false;
  }
}

/**
 * Gets the timestamp of the last saved state
 */
export function getLastSavedTimestamp(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
}

/**
 * Clears all transfers ops storage keys (Reset to default)
 */
export function clearSystemStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  Object.values(STORAGE_KEYS).forEach(k => {
    window.localStorage.removeItem(k);
  });
}

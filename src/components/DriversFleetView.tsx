import React, { useState } from 'react';
import {
  Users,
  Truck,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Car,
  Bus,
  CheckCircle2,
  MapPin,
  Edit2,
  Trash2,
  Power,
  AlertTriangle,
  X,
  Calendar,
  CreditCard,
  FileText,
  HardDrive,
  Save,
  Database,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Info,
  Wrench,
} from 'lucide-react';
import { Driver, Vehicle, DriverRegime, DriverCategory, VehicleCategory, Allocation } from '../types';

interface DriversFleetViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  allocations?: Allocation[];
  onAddDriver: (driver: Driver) => void;
  onUpdateDriver?: (driver: Driver) => void;
  onDeleteDriver?: (driverId: string) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (vehicle: Vehicle) => void;
  onDeleteVehicle?: (vehicleId: string) => void;
  onManualSaveDrivers?: () => boolean;
  onManualSaveVehicles?: () => boolean;
  onResetDrivers?: () => void;
  onResetVehicles?: () => void;
  onOpenBackupModal?: () => void;
}

export const DriversFleetView: React.FC<DriversFleetViewProps> = ({
  drivers,
  vehicles,
  allocations = [],
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onManualSaveDrivers,
  onManualSaveVehicles,
  onResetDrivers,
  onResetVehicles,
  onOpenBackupModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [regimeFilter, setRegimeFilter] = useState<'ALL' | DriverRegime>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DriverCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Vehicles Filters
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<'ALL' | VehicleCategory>('ALL');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Persistence Toast State
  const [saveToast, setSaveToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info' | 'error';
    timestamp?: string;
  } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const time = new Date().toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setSaveToast({ show: true, message, type, timestamp: time });
    setTimeout(() => {
      setSaveToast(prev => (prev?.timestamp === time ? null : prev));
    }, 4500);
  };

  const handleExplicitSave = () => {
    if (activeSubTab === 'drivers') {
      if (onManualSaveDrivers) {
        const success = onManualSaveDrivers();
        if (success) {
          triggerToast('Todas as alterações e dados dos motoristas foram guardados na base de dados de produção!');
        } else {
          triggerToast('Erro ao guardar alterações de motoristas.', 'error');
        }
      } else {
        triggerToast('Base de dados de motoristas sincronizada e persistida localmente no navegador.');
      }
    } else {
      if (onManualSaveVehicles) {
        const success = onManualSaveVehicles();
        if (success) {
          triggerToast('Todas as alterações e dados da frota de veículos foram guardados na base de dados de produção!');
        } else {
          triggerToast('Erro ao guardar alterações da frota de veículos.', 'error');
        }
      } else {
        triggerToast('Base de dados da frota de veículos sincronizada e persistida localmente no navegador.');
      }
    }
  };

  // New driver modal state
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverMechanicalNumber, setNewDriverMechanicalNumber] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverBirthDate, setNewDriverBirthDate] = useState('');
  const [newDriverCitizenCardNumber, setNewDriverCitizenCardNumber] = useState('');
  const [newDriverTaxNumber, setNewDriverTaxNumber] = useState('');
  const [newDriverFiscalAddress, setNewDriverFiscalAddress] = useState('');
  const [newDriverRegime, setNewDriverRegime] = useState<DriverRegime>('ASSALARIADO');
  const [newDriverCategory, setNewDriverCategory] = useState<DriverCategory>('LIGEIROS');
  const [newDriverLicense, setNewDriverLicense] = useState('');
  const [newDriverCamExpiry, setNewDriverCamExpiry] = useState('2028-12-31');
  const [newDriverError, setNewDriverError] = useState<string | null>(null);

  // Edit driver modal state
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverMechanicalNumber, setEditDriverMechanicalNumber] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverEmail, setEditDriverEmail] = useState('');
  const [editDriverBirthDate, setEditDriverBirthDate] = useState('');
  const [editDriverCitizenCardNumber, setEditDriverCitizenCardNumber] = useState('');
  const [editDriverTaxNumber, setEditDriverTaxNumber] = useState('');
  const [editDriverFiscalAddress, setEditDriverFiscalAddress] = useState('');
  const [editDriverRegime, setEditDriverRegime] = useState<DriverRegime>('ASSALARIADO');
  const [editDriverHasScheduleExemption, setEditDriverHasScheduleExemption] = useState(true);
  const [editDriverCategory, setEditDriverCategory] = useState<DriverCategory>('LIGEIROS');
  const [editDriverLicense, setEditDriverLicense] = useState('');
  const [editDriverCamExpiry, setEditDriverCamExpiry] = useState('2027-12-31');
  const [editDriverActive, setEditDriverActive] = useState(true);

  // Delete driver modal state
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // New vehicle modal state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleCategory, setNewVehicleCategory] = useState<VehicleCategory>('LIGEIROS');
  const [newVehicleSeats, setNewVehicleSeats] = useState(7);
  const [newVehicleYear, setNewVehicleYear] = useState('2024');
  const [newVehicleInspectionExpiry, setNewVehicleInspectionExpiry] = useState('2027-06-30');
  const [newVehicleNotes, setNewVehicleNotes] = useState('');
  const [newVehicleError, setNewVehicleError] = useState<string | null>(null);

  // Edit vehicle modal state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehiclePlate, setEditVehiclePlate] = useState('');
  const [editVehicleModel, setEditVehicleModel] = useState('');
  const [editVehicleCategory, setEditVehicleCategory] = useState<VehicleCategory>('LIGEIROS');
  const [editVehicleSeats, setEditVehicleSeats] = useState(7);
  const [editVehicleActive, setEditVehicleActive] = useState(true);
  const [editVehicleYear, setEditVehicleYear] = useState('');
  const [editVehicleInspectionExpiry, setEditVehicleInspectionExpiry] = useState('');
  const [editVehicleNotes, setEditVehicleNotes] = useState('');
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);

  // Delete vehicle modal state
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const handleOpenNewDriverModal = () => {
    const nextMech = `MOT-${drivers.length + 1}`;
    setNewDriverName('');
    setNewDriverMechanicalNumber(nextMech);
    setNewDriverPhone('');
    setNewDriverEmail('');
    setNewDriverBirthDate('');
    setNewDriverCitizenCardNumber('');
    setNewDriverTaxNumber('');
    setNewDriverFiscalAddress('');
    setNewDriverRegime('ASSALARIADO');
    setNewDriverCategory('LIGEIROS');
    setNewDriverLicense('');
    setNewDriverCamExpiry('2028-12-31');
    setNewDriverError(null);
    setShowDriverModal(true);
  };

  const handleOpenNewVehicleModal = () => {
    setNewVehiclePlate('');
    setNewVehicleModel('');
    setNewVehicleCategory('LIGEIROS');
    setNewVehicleSeats(7);
    setNewVehicleYear(new Date().getFullYear().toString());
    setNewVehicleInspectionExpiry('2027-06-30');
    setNewVehicleNotes('');
    setNewVehicleError(null);
    setShowVehicleModal(true);
  };

  const handleRegimeChange = (regime: DriverRegime) => {
    setNewDriverRegime(regime);
    if (
      !newDriverMechanicalNumber ||
      newDriverMechanicalNumber.startsWith('MOT-') ||
      newDriverMechanicalNumber.startsWith('FL-')
    ) {
      setNewDriverMechanicalNumber(
        regime === 'ASSALARIADO' ? `MOT-${drivers.length + 1}` : `FL-${drivers.length + 1}`
      );
    }
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newDriverName.trim();
    if (!trimmedName) {
      setNewDriverError('Por favor, indique o nome completo do motorista.');
      return;
    }

    const defaultMech =
      newDriverRegime === 'ASSALARIADO' ? `MOT-${drivers.length + 1}` : `FL-${drivers.length + 1}`;
    const finalMech = newDriverMechanicalNumber.trim() || defaultMech;
    const finalLicense =
      newDriverLicense.trim() || `L-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const newDriver: Driver = {
      id: `d-${Date.now()}`,
      mechanicalNumber: finalMech,
      name: trimmedName,
      phone: newDriverPhone.trim() || '+351 900 000 000',
      email:
        newDriverEmail.trim() ||
        `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@transfers.pt`,
      birthDate: newDriverBirthDate.trim() || undefined,
      citizenCardNumber: newDriverCitizenCardNumber.trim() || undefined,
      taxNumber: newDriverTaxNumber.trim() || undefined,
      fiscalAddress: newDriverFiscalAddress.trim() || undefined,
      regime: newDriverRegime,
      hasScheduleExemption: newDriverRegime === 'ASSALARIADO',
      category: newDriverCategory,
      licenseNumber: finalLicense,
      camExpiryDate:
        newDriverCategory === 'MISTO_PESADOS' ? (newDriverCamExpiry || '2028-12-31') : undefined,
      active: true,
    };

    onAddDriver(newDriver);

    // Reset filters to ensure the new driver is visible immediately in the list
    setRegimeFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');

    setShowDriverModal(false);
    triggerToast(`Motorista "${newDriver.name}" adicionado e salvo com sucesso em produção!`);

    // Reset form
    setNewDriverName('');
    setNewDriverMechanicalNumber('');
    setNewDriverPhone('');
    setNewDriverEmail('');
    setNewDriverBirthDate('');
    setNewDriverCitizenCardNumber('');
    setNewDriverTaxNumber('');
    setNewDriverFiscalAddress('');
    setNewDriverLicense('');
    setNewDriverError(null);
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPlate = newVehiclePlate.trim().toUpperCase();
    const trimmedModel = newVehicleModel.trim();

    if (!trimmedPlate) {
      setNewVehicleError('Por favor, indique a matrícula da viatura (ex: 55-AA-88).');
      return;
    }
    if (!trimmedModel) {
      setNewVehicleError('Por favor, indique a marca e modelo da viatura (ex: Mercedes-Benz Sprinter 519).');
      return;
    }

    const newVehicle: Vehicle = {
      id: `v-${Date.now()}`,
      plate: trimmedPlate,
      brandModel: trimmedModel,
      category: newVehicleCategory,
      seats: Number(newVehicleSeats) || (newVehicleCategory === 'PESADOS_PASSAGEIROS' ? 19 : 7),
      active: true,
      year: newVehicleYear ? parseInt(newVehicleYear) : undefined,
      inspectionExpiry: newVehicleInspectionExpiry || undefined,
      notes: newVehicleNotes.trim() || undefined,
    };

    onAddVehicle(newVehicle);

    // Reset vehicle filters to guarantee visibility immediately
    setVehicleSearchQuery('');
    setVehicleCategoryFilter('ALL');
    setVehicleStatusFilter('ALL');

    setShowVehicleModal(false);
    triggerToast(`Viatura "${newVehicle.plate} - ${newVehicle.brandModel}" registada e salva em produção com sucesso!`);

    // Reset form
    setNewVehiclePlate('');
    setNewVehicleModel('');
    setNewVehicleNotes('');
    setNewVehicleError(null);
  };

  const handleStartEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditVehiclePlate(vehicle.plate);
    setEditVehicleModel(vehicle.brandModel);
    setEditVehicleCategory(vehicle.category);
    setEditVehicleSeats(vehicle.seats);
    setEditVehicleActive(vehicle.active);
    setEditVehicleYear(vehicle.year ? vehicle.year.toString() : '');
    setEditVehicleInspectionExpiry(vehicle.inspectionExpiry || '');
    setEditVehicleNotes(vehicle.notes || '');
    setEditVehicleError(null);
  };

  const handleSaveEditVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    const trimmedPlate = editVehiclePlate.trim().toUpperCase();
    const trimmedModel = editVehicleModel.trim();

    if (!trimmedPlate) {
      setEditVehicleError('A matrícula não pode ficar em branco.');
      return;
    }
    if (!trimmedModel) {
      setEditVehicleError('A marca e modelo não podem ficar em branco.');
      return;
    }

    const updatedVehicle: Vehicle = {
      ...editingVehicle,
      plate: trimmedPlate,
      brandModel: trimmedModel,
      category: editVehicleCategory,
      seats: Number(editVehicleSeats) || 1,
      active: editVehicleActive,
      year: editVehicleYear ? parseInt(editVehicleYear) : undefined,
      inspectionExpiry: editVehicleInspectionExpiry.trim() || undefined,
      notes: editVehicleNotes.trim() || undefined,
    };

    if (onUpdateVehicle) {
      onUpdateVehicle(updatedVehicle);
    }

    setEditingVehicle(null);
    triggerToast(`Viatura "${updatedVehicle.plate}" atualizada e salva com sucesso em produção!`);
  };

  const handleToggleVehicleStatus = (vehicle: Vehicle) => {
    if (!onUpdateVehicle) return;
    const updated: Vehicle = {
      ...vehicle,
      active: !vehicle.active,
    };
    onUpdateVehicle(updated);
    triggerToast(
      `Viatura ${vehicle.plate} marcada como ${updated.active ? 'OPERACIONAL / ATIVA' : 'INATIVA / MANUTENÇÃO'} e salva em produção!`,
      updated.active ? 'success' : 'info'
    );
  };

  const handleConfirmDeleteVehicle = () => {
    if (!vehicleToDelete || !onDeleteVehicle) return;
    onDeleteVehicle(vehicleToDelete.id);
    triggerToast(`Viatura "${vehicleToDelete.plate}" removida com sucesso da frota de produção!`, 'info');
    setVehicleToDelete(null);
  };

  const handleStartEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDriverName(driver.name);
    setEditDriverMechanicalNumber(driver.mechanicalNumber || '');
    setEditDriverPhone(driver.phone || '');
    setEditDriverEmail(driver.email || '');
    setEditDriverBirthDate(driver.birthDate || '');
    setEditDriverCitizenCardNumber(driver.citizenCardNumber || '');
    setEditDriverTaxNumber(driver.taxNumber || '');
    setEditDriverFiscalAddress(driver.fiscalAddress || '');
    setEditDriverRegime(driver.regime);
    setEditDriverHasScheduleExemption(driver.hasScheduleExemption ?? (driver.regime === 'ASSALARIADO'));
    setEditDriverCategory(driver.category);
    setEditDriverLicense(driver.licenseNumber || '');
    setEditDriverCamExpiry(driver.camExpiryDate || '2027-12-31');
    setEditDriverActive(driver.active !== false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver || !editDriverName.trim()) return;

    const finalLicense = editDriverLicense.trim() || editingDriver.licenseNumber || 'Pendente';

    const updated: Driver = {
      ...editingDriver,
      mechanicalNumber: editDriverMechanicalNumber.trim() || editingDriver.mechanicalNumber,
      name: editDriverName.trim(),
      phone: editDriverPhone.trim() || '+351 900 000 000',
      email: editDriverEmail.trim() || `${editDriverName.toLowerCase().replace(/\s+/g, '.')}@transfers.pt`,
      birthDate: editDriverBirthDate.trim() || undefined,
      citizenCardNumber: editDriverCitizenCardNumber.trim() || undefined,
      taxNumber: editDriverTaxNumber.trim() || undefined,
      fiscalAddress: editDriverFiscalAddress.trim() || undefined,
      regime: editDriverRegime,
      hasScheduleExemption: editDriverHasScheduleExemption,
      category: editDriverCategory,
      licenseNumber: finalLicense,
      camExpiryDate: editDriverCategory === 'MISTO_PESADOS' ? editDriverCamExpiry : undefined,
      active: editDriverActive,
    };

    if (onUpdateDriver) {
      onUpdateDriver(updated);
    }
    setEditingDriver(null);
    triggerToast(`Alterações do motorista "${updated.name}" salvas com sucesso em produção!`);
  };

  const handleToggleStatus = (driver: Driver) => {
    const newActiveState = driver.active === false;
    if (onUpdateDriver) {
      onUpdateDriver({
        ...driver,
        active: newActiveState,
      });
    }
    triggerToast(`Motorista "${driver.name}" marcado como ${newActiveState ? 'ATIVO' : 'INATIVO'} e guardado.`);
  };

  const handleConfirmDelete = () => {
    if (!driverToDelete) return;
    const deletedName = driverToDelete.name;
    if (onDeleteDriver) {
      onDeleteDriver(driverToDelete.id);
    }
    setDriverToDelete(null);
    triggerToast(`Motorista "${deletedName}" removido do sistema com sucesso.`, 'info');
  };

  const filteredDrivers = drivers.filter(d => {
    if (regimeFilter !== 'ALL' && d.regime !== regimeFilter) return false;
    if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
    if (statusFilter === 'ACTIVE' && d.active === false) return false;
    if (statusFilter === 'INACTIVE' && d.active !== false) return false;
    return true;
  });

  const filteredVehicles = vehicles.filter(v => {
    const q = vehicleSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      v.plate.toLowerCase().includes(q) ||
      v.brandModel.toLowerCase().includes(q) ||
      (v.notes && v.notes.toLowerCase().includes(q));

    const matchesCategory =
      vehicleCategoryFilter === 'ALL' || v.category === vehicleCategoryFilter;

    const matchesStatus =
      vehicleStatusFilter === 'ALL' ||
      (vehicleStatusFilter === 'ACTIVE' && v.active !== false) ||
      (vehicleStatusFilter === 'INACTIVE' && v.active === false);

    return Boolean(matchesSearch && matchesCategory && matchesStatus);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestão de Motoristas & Frota</h1>
          <p className="text-sm text-slate-500">
            Controlo de qualificações de condução (Carta B vs CAM/D) e categorias de veículos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'drivers' && (
            <button
              type="button"
              onClick={handleExplicitSave}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-xs flex items-center gap-2"
              title="Guardar explicitamente todas as alterações de motoristas na base de dados de produção"
            >
              <Save className="w-4 h-4" />
              <span>Salvar em Produção</span>
            </button>
          )}
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold transition-colors shadow-2xs flex items-center gap-2"
              title="Exportar dados de motoristas e veículos em JSON ou CSV"
            >
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Exportar / Backup</span>
            </button>
          )}
          {activeSubTab === 'drivers' ? (
            <button
              onClick={handleOpenNewDriverModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Motorista</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewVehicleModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Veículo</span>
            </button>
          )}
        </div>
      </div>

      {/* Production Persistence Status Banner */}
      {activeSubTab === 'drivers' ? (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Base de Dados de Motoristas</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  AUTO-SAVE 30s ATIVO
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Todas as adições e edições de motoristas são gravadas automaticamente a cada 30s e persistem permanentemente em produção e recarregamentos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExplicitSave}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Gravar Agora</span>
            </button>
            {onResetDrivers && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Atenção: Deseja repor a lista de motoristas para a configuração inicial de demonstração?')) {
                    onResetDrivers();
                    triggerToast('Lista de motoristas reposta para a configuração inicial.', 'info');
                  }
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors border border-slate-700 cursor-pointer"
                title="Repor lista de motoristas para valores de teste originais"
              >
                Repor Iniciais
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Base de Dados da Frota de Veículos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  AUTO-SAVE 30s ATIVO
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Todas as adições e alterações na frota são gravadas automaticamente a cada 30 segundos e persistem em produção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExplicitSave}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Gravar Agora</span>
            </button>
            {onResetVehicles && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Atenção: Deseja repor a frota de veículos para a configuração inicial de demonstração?')) {
                    onResetVehicles();
                    triggerToast('Frota de veículos reposta para a configuração inicial.', 'info');
                  }
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors border border-slate-700 cursor-pointer"
                title="Repor frota de veículos para valores de teste originais"
              >
                Repor Iniciais
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('drivers')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'drivers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Motoristas ({drivers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('vehicles')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'vehicles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Frota de Veículos ({vehicles.length})</span>
        </button>
      </div>

      {/* Drivers List Content */}
      {activeSubTab === 'drivers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs">
            <span className="font-bold text-slate-600">Filtro por Regime:</span>
            <div className="flex items-center gap-1">
              {(['ALL', 'ASSALARIADO', 'FREELANCER'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRegimeFilter(r)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    regimeFilter === r
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r === 'ALL' ? 'Todos' : r === 'ASSALARIADO' ? 'Assalariados (IHT)' : 'Free-lancers'}
                </button>
              ))}
            </div>

            <span className="font-bold text-slate-600 ml-4">Habilitação:</span>
            <div className="flex items-center gap-1">
              {(['ALL', 'LIGEIROS', 'MISTO_PESADOS'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    categoryFilter === c
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c === 'ALL' ? 'Todas' : c === 'LIGEIROS' ? 'Apenas Ligeiros' : 'Ligeiros + Pesados'}
                </button>
              ))}
            </div>

            <span className="font-bold text-slate-600 ml-4">Estado:</span>
            <div className="flex items-center gap-1">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFilter === s
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'ALL' ? 'Todos' : s === 'ACTIVE' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nº Mec. / Nome</th>
                    <th className="py-3 px-4">Regime Contratual</th>
                    <th className="py-3 px-4">Habilitação de Veículo</th>
                    <th className="py-3 px-4">Isenção de Horário</th>
                    <th className="py-3 px-4">Carta / CAM</th>
                    <th className="py-3 px-4">Contactos</th>
                    <th className="py-3 px-4 min-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Uso Interno / Fiscalização</span>
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded leading-none" title="Dados opcionais: NIF, CC, Data de Nascimento e Morada Fiscal">
                          Opcional
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map(driver => {
                    const isActive = driver.active !== false;

                    return (
                      <tr
                        key={driver.id}
                        className={`transition-colors ${
                          isActive
                            ? 'hover:bg-slate-50'
                            : 'bg-slate-50/70 hover:bg-slate-100/70 text-slate-500'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{driver.name}</span>
                            {!isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                                Inativo
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {driver.mechanicalNumber}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              driver.regime === 'ASSALARIADO'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {driver.regime === 'ASSALARIADO' ? 'Assalariado' : 'Free-lancer'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                              driver.category === 'MISTO_PESADOS'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {driver.category === 'MISTO_PESADOS' ? (
                              <>
                                <Bus className="w-3 h-3 text-purple-600" />
                                <span>Ligeiros + Pesados</span>
                              </>
                            ) : (
                              <>
                                <Car className="w-3 h-3 text-slate-500" />
                                <span>Apenas Ligeiros</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {driver.hasScheduleExemption ? (
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Sim (IHT Ativa)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Não (Por hora/pacote)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>{driver.licenseNumber}</div>
                          {driver.camExpiryDate && (
                            <div className="text-[10px] text-purple-700 font-semibold">
                              CAM Válido até {driver.camExpiryDate}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <div>{driver.phone}</div>
                          <div className="text-slate-400 text-[10px]">{driver.email}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 max-w-sm">
                          {driver.taxNumber || driver.citizenCardNumber || driver.birthDate || driver.fiscalAddress ? (
                            <div className="space-y-1">
                              {(driver.taxNumber || driver.citizenCardNumber) && (
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  {driver.taxNumber && (
                                    <span className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                                      <span className="text-slate-500 font-semibold">NIF:</span> {driver.taxNumber}
                                    </span>
                                  )}
                                  {driver.citizenCardNumber && (
                                    <span className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                                      <span className="text-slate-500 font-semibold">CC:</span> {driver.citizenCardNumber}
                                    </span>
                                  )}
                                </div>
                              )}
                              {driver.birthDate && (
                                <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Nasc.: {driver.birthDate}</span>
                                </div>
                              )}
                              {driver.fiscalAddress && (
                                <div className="flex items-start gap-1 text-[11px] text-slate-700 leading-snug">
                                  <MapPin className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">{driver.fiscalAddress}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Não registado</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(driver)}
                            title={isActive ? 'Clique para desativar motorista' : 'Clique para reativar motorista'}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                              isActive
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                              }`}
                            />
                            <span>{isActive ? 'ATIVO' : 'INATIVO'}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(driver)}
                              className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                              title="Editar dados do motorista"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(driver)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isActive
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={isActive ? 'Colocar em estado inativo' : 'Colocar em estado ativo'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDriverToDelete(driver)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                              title="Eliminar motorista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vehicles List Content */}
      {activeSubTab === 'vehicles' && (
        <div className="space-y-4">
          {/* Vehicle Filters & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={vehicleSearchQuery}
                onChange={e => setVehicleSearchQuery(e.target.value)}
                placeholder="Pesquisar matrícula, marca, modelo ou notas..."
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/50"
              />
              {vehicleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setVehicleSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-500 shrink-0">Categoria:</span>
              {(['ALL', 'LIGEIROS', 'PESADOS_PASSAGEIROS'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setVehicleCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    vehicleCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL'
                    ? 'Todas'
                    : cat === 'LIGEIROS'
                    ? 'Ligeiros'
                    : 'Pesados'}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-500 shrink-0">Estado:</span>
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setVehicleStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    vehicleStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Todos'
                    : st === 'ACTIVE'
                    ? 'Operacionais'
                    : 'Inativos'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              A apresentar <strong>{filteredVehicles.length}</strong> de <strong>{vehicles.length}</strong> viaturas na frota
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                {vehicles.filter(v => v.active !== false).length} Operacionais
              </span>
              {vehicles.some(v => v.active === false) && (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  {vehicles.filter(v => v.active === false).length} Inativas
                </span>
              )}
            </div>
          </div>

          {/* Vehicles Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Matrícula & Ano</th>
                    <th className="py-3 px-4">Marca & Modelo</th>
                    <th className="py-3 px-4">Categoria Operacional</th>
                    <th className="py-3 px-4">Lotação</th>
                    <th className="py-3 px-4">Inspeção / IPO</th>
                    <th className="py-3 px-4 text-center">Estado Operacional</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">Nenhuma viatura encontrada com os filtros selecionados.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Experimente limpar a pesquisa ou os filtros de categoria/estado.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map(v => {
                      const isActive = v.active !== false;
                      const assignedAllocations = allocations.filter(a => a.vehicleId === v.id);

                      return (
                        <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${!isActive ? 'opacity-70 bg-slate-50/50' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-sm tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                {v.plate}
                              </span>
                              {v.year && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {v.year}
                                </span>
                              )}
                            </div>
                            {assignedAllocations.length > 0 && (
                              <span className="inline-block mt-1 text-[10px] text-blue-600 font-semibold">
                                {assignedAllocations.length} serviço(s) na escala
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{v.brandModel}</div>
                            {v.notes && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[260px] flex items-center gap-1 mt-0.5" title={v.notes}>
                                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{v.notes}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                v.category === 'PESADOS_PASSAGEIROS'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {v.category === 'PESADOS_PASSAGEIROS' ? (
                                <>
                                  <Bus className="w-3 h-3 text-purple-600" />
                                  <span>Pesados de Passageiros</span>
                                </>
                              ) : (
                                <>
                                  <Car className="w-3 h-3 text-blue-600" />
                                  <span>Ligeiros</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{v.seats} Lugares</span>
                          </td>
                          <td className="py-3 px-4">
                            {v.inspectionExpiry ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-medium text-slate-700">{v.inspectionExpiry}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Regularizada</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleVehicleStatus(v)}
                              className={`px-2.5 py-1 rounded-full font-bold text-[10px] transition-colors cursor-pointer border ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                              title="Clique para alternar estado da viatura e salvar na base de dados de produção"
                            >
                              {isActive ? 'OPERACIONAL' : 'INATIVO / MANUTENÇÃO'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditVehicle(v)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar dados da viatura"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleVehicleStatus(v)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isActive
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'Desativar / Colocar em manutenção' : 'Ativar viatura'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setVehicleToDelete(v)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar viatura da frota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Driver */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">Registar Novo Motorista</h2>
                <p className="text-xs text-slate-500">Defina o regime contratual e as habilitações legais.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="new-driver-form"
              noValidate
              onSubmit={handleCreateDriver}
              className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
            >
              {/* Production Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="leading-tight">
                  <span className="font-bold">Persistência em Produção Ativa:</span> O novo motorista será guardado de imediato e estará sempre disponível nesta máquina/navegador.
                </div>
              </div>

              {/* Validation Error Alert */}
              {newDriverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newDriverError}</span>
                </div>
              )}

              {/* Nome e Nº Mecanográfico */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Nome Completo: *</span>
                    <span className="text-[10px] text-blue-600 font-normal">Obrigatório</span>
                  </label>
                  <input
                    type="text"
                    value={newDriverName}
                    onChange={e => {
                      setNewDriverName(e.target.value);
                      if (newDriverError) setNewDriverError(null);
                    }}
                    placeholder="Ex: Gonçalo Ribeiro"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Nº Mecanográfico:</label>
                  <input
                    type="text"
                    value={newDriverMechanicalNumber}
                    onChange={e => setNewDriverMechanicalNumber(e.target.value)}
                    placeholder="Ex: MOT-10"
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Regime Contratual:</label>
                  <select
                    value={newDriverRegime}
                    onChange={e => handleRegimeChange(e.target.value as DriverRegime)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 bg-white font-semibold"
                  >
                    <option value="ASSALARIADO">Assalariado (IHT)</option>
                    <option value="FREELANCER">Free-lancer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Habilitação Veículo:</label>
                  <select
                    value={newDriverCategory}
                    onChange={e => setNewDriverCategory(e.target.value as DriverCategory)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 bg-white font-semibold"
                  >
                    <option value="LIGEIROS">Apenas Ligeiros</option>
                    <option value="MISTO_PESADOS">Ligeiros + Pesados</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Carta de Condução:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </label>
                  <input
                    type="text"
                    value={newDriverLicense}
                    onChange={e => setNewDriverLicense(e.target.value)}
                    placeholder="Ex: L-9482710 (auto)"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {newDriverCategory === 'MISTO_PESADOS' ? (
                  <div>
                    <label className="text-xs font-bold text-purple-700">Validade CAM:</label>
                    <input
                      type="date"
                      value={newDriverCamExpiry}
                      onChange={e => setNewDriverCamExpiry(e.target.value)}
                      className="w-full text-xs rounded-lg border border-purple-300 p-2 mt-1 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-700">Tipo de Carta:</label>
                    <input
                      type="text"
                      disabled
                      value="Categoria B (Ligeiros)"
                      className="w-full text-xs rounded-lg border border-slate-200 p-2 mt-1 bg-slate-100 text-slate-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Telemóvel:</label>
                  <input
                    type="text"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    placeholder="+351 9..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Email:</label>
                  <input
                    type="email"
                    value={newDriverEmail}
                    onChange={e => setNewDriverEmail(e.target.value)}
                    placeholder="motorista@empresa.pt"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Secção: Uso Interno / Fiscalização (Preenchimento Opcional) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Uso Interno / Fiscalização</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    Preenchimento Opcional
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Data de Nascimento:</span>
                    </label>
                    <input
                      type="date"
                      value={newDriverBirthDate}
                      onChange={e => setNewDriverBirthDate(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nº Cartão Cidadão:</span>
                    </label>
                    <input
                      type="text"
                      value={newDriverCitizenCardNumber}
                      onChange={e => setNewDriverCitizenCardNumber(e.target.value)}
                      placeholder="Ex: 12849201 4 ZX9"
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Número Fiscal (NIF):</span>
                    </label>
                    <input
                      type="text"
                      value={newDriverTaxNumber}
                      onChange={e => setNewDriverTaxNumber(e.target.value)}
                      placeholder="Ex: 219482019"
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Endereço / Morada Fiscal:</span>
                  </label>
                  <input
                    type="text"
                    value={newDriverFiscalAddress}
                    onChange={e => setNewDriverFiscalAddress(e.target.value)}
                    placeholder="Ex: Av. da Liberdade, n.º 182, 3.º Dto, 1250-142 Lisboa"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>

                <p className="text-[10px] text-slate-400 leading-normal">
                  Estes dados destinam-se exclusivamente a arquivo interno e envio quando solicitado por autoridades fiscalizadoras (IMT, ACT, AT). Por defeito, não surgem em folhas de serviço públicas.
                </p>
              </div>
            </form>

            {/* Modal Footer: ALWAYS visible and sticky */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDriverModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="new-driver-form"
                onClick={handleCreateDriver}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Novo Motorista em Produção</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Vehicle */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Registar Novo Veículo na Frota</h2>
                  <p className="text-xs text-slate-500">Adicione viaturas ligeiras ou pesadas à frota de produção</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVehicleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Persistence notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="leading-snug">
                  <strong>Persistência em Produção Ativa:</strong> A nova viatura será guardada de imediato na base de dados de produção do sistema.
                </span>
              </div>

              {newVehicleError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{newVehicleError}</span>
                </div>
              )}

              <form id="new-vehicle-form" onSubmit={handleCreateVehicle} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Matrícula:</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newVehiclePlate}
                      onChange={e => {
                        setNewVehiclePlate(e.target.value.toUpperCase());
                        setNewVehicleError(null);
                      }}
                      placeholder="Ex: 55-AA-88"
                      className="w-full text-xs font-mono font-bold tracking-wider rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Formato português (ex: AA-00-AA ou 00-AA-00)</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Lotação (Passageiros):</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={90}
                      value={newVehicleSeats}
                      onChange={e => setNewVehicleSeats(parseInt(e.target.value) || 1)}
                      className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                    {/* Quick presets */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Atalhos:</span>
                      {[4, 7, 8, 9, 19, 55].map(seats => (
                        <button
                          key={seats}
                          type="button"
                          onClick={() => setNewVehicleSeats(seats)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded transition-colors"
                        >
                          {seats}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Marca e Modelo:</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newVehicleModel}
                    onChange={e => {
                      setNewVehicleModel(e.target.value);
                      setNewVehicleError(null);
                    }}
                    placeholder="Ex: Mercedes-Benz Sprinter 519 CDI"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Categoria Operacional:</label>
                  <select
                    value={newVehicleCategory}
                    onChange={e => {
                      const newCat = e.target.value as VehicleCategory;
                      setNewVehicleCategory(newCat);
                      if (newCat === 'PESADOS_PASSAGEIROS' && newVehicleSeats < 10) {
                        setNewVehicleSeats(19);
                      } else if (newCat === 'LIGEIROS' && newVehicleSeats > 9) {
                        setNewVehicleSeats(7);
                      }
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="LIGEIROS">Ligeiros (até 9 lugares - Ex: Sedans, Monovolumes, Vans)</option>
                    <option value="PESADOS_PASSAGEIROS">Pesados de Passageiros (Autocarros e Minibus com mais de 9 lugares)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ano de Fabrico (Opcional):</span>
                    </label>
                    <input
                      type="number"
                      min={1990}
                      max={2030}
                      value={newVehicleYear}
                      onChange={e => setNewVehicleYear(e.target.value)}
                      placeholder="Ex: 2024"
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Validade IPO / Inspeção:</span>
                    </label>
                    <input
                      type="date"
                      value={newVehicleInspectionExpiry}
                      onChange={e => setNewVehicleInspectionExpiry(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Observações / Equipamento (Opcional):</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newVehicleNotes}
                    onChange={e => setNewVehicleNotes(e.target.value)}
                    placeholder="Ex: Equipado com Wi-Fi, ar condicionado tri-zona, engate de reboque para malas..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowVehicleModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="new-vehicle-form"
                onClick={handleCreateVehicle}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Novo Veículo em Produção</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Vehicle */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditVehicle}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Editar Dados da Viatura</h2>
                  <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded border border-slate-300 font-bold text-slate-700">
                    {editingVehicle.plate}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Atualize os dados e estado operacional da viatura na frota.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Persistence notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="leading-snug">
                <strong>Persistência em Produção:</strong> As alterações efetuadas nesta viatura serão salvas de imediato na base de dados de produção.
              </span>
            </div>

            {editVehicleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editVehicleError}</span>
              </div>
            )}

            {/* Estado Operacional Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-slate-500" />
                <span>Estado Operacional da Viatura:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditVehicleActive(true)}
                  className={`p-2.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    editVehicleActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OPERACIONAL / ATIVO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditVehicleActive(false)}
                  className={`p-2.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    !editVehicleActive
                      ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>INATIVO / MANUTENÇÃO</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Matrícula:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editVehiclePlate}
                  onChange={e => setEditVehiclePlate(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold tracking-wider rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Lotação (Passageiros):</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={90}
                  value={editVehicleSeats}
                  onChange={e => setEditVehicleSeats(parseInt(e.target.value) || 1)}
                  className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Marca e Modelo:</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editVehicleModel}
                onChange={e => setEditVehicleModel(e.target.value)}
                placeholder="Ex: Mercedes-Benz Sprinter 519 CDI"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Categoria Operacional:</label>
              <select
                value={editVehicleCategory}
                onChange={e => setEditVehicleCategory(e.target.value as VehicleCategory)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
              >
                <option value="LIGEIROS">Ligeiros (até 9 lugares)</option>
                <option value="PESADOS_PASSAGEIROS">Pesados de Passageiros (Autocarros e Minibus)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ano de Fabrico (Opcional):</span>
                </label>
                <input
                  type="number"
                  min={1990}
                  max={2030}
                  value={editVehicleYear}
                  onChange={e => setEditVehicleYear(e.target.value)}
                  placeholder="Ex: 2024"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Validade IPO / Inspeção:</span>
                </label>
                <input
                  type="date"
                  value={editVehicleInspectionExpiry}
                  onChange={e => setEditVehicleInspectionExpiry(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Observações / Equipamento (Opcional):</span>
              </label>
              <textarea
                rows={2}
                value={editVehicleNotes}
                onChange={e => setEditVehicleNotes(e.target.value)}
                placeholder="Ex: Equipado com Wi-Fi, ar condicionado tri-zona, engate de reboque..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              />
            </div>

            {/* Botões do Rodapé */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => {
                  const vehToDel = editingVehicle;
                  setEditingVehicle(null);
                  setVehicleToDelete(vehToDel);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Viatura</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações em Produção</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Driver */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Editar Motorista</h2>
                  <span className="px-2 py-0.5 font-mono text-[11px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                    {editingDriver.mechanicalNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualize dados de identificação, regime contratual, estado ativo/inativo e morada fiscal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Production Notice */}
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold">Persistência em Produção:</span> As alterações efetuadas serão salvas de imediato na base de dados de produção da aplicação.
              </div>
            </div>

            {/* Estado Operacional (Ativo / Inativo) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Estado Operacional:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditDriverActive(true)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold border transition-all ${
                    editDriverActive
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ATIVO (Disponível)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditDriverActive(false)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold border transition-all ${
                    !editDriverActive
                      ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>INATIVO (Suspenso)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                {editDriverActive
                  ? 'O motorista está disponível para novas escalas, serviços e cálculo de disponibilidades.'
                  : 'Motoristas inativos ficam bloqueados para novas escalas sem apagar o histórico de serviços anteriores.'}
              </p>
            </div>

            {/* Nome Completo e Nº Mecanográfico */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Nome Completo:</label>
                <input
                  type="text"
                  required
                  value={editDriverName}
                  onChange={e => setEditDriverName(e.target.value)}
                  placeholder="Ex: Gonçalo Ribeiro"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Nº Mecanográfico:</label>
                <input
                  type="text"
                  required
                  value={editDriverMechanicalNumber}
                  onChange={e => setEditDriverMechanicalNumber(e.target.value)}
                  placeholder="Ex: MOT-1"
                  className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* Regime e Categoria */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Regime Contratual:</label>
                <select
                  value={editDriverRegime}
                  onChange={e => {
                    const r = e.target.value as DriverRegime;
                    setEditDriverRegime(r);
                    if (r === 'ASSALARIADO') {
                      setEditDriverHasScheduleExemption(true);
                    }
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 bg-white"
                >
                  <option value="ASSALARIADO">Assalariado (IHT)</option>
                  <option value="FREELANCER">Free-lancer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Habilitação de Veículo:</label>
                <select
                  value={editDriverCategory}
                  onChange={e => setEditDriverCategory(e.target.value as DriverCategory)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 bg-white"
                >
                  <option value="LIGEIROS">Apenas Ligeiros</option>
                  <option value="MISTO_PESADOS">Ligeiros + Pesados</option>
                </select>
              </div>
            </div>

            {/* Isenção de Horário (IHT) */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="editHasScheduleExemption"
                checked={editDriverHasScheduleExemption}
                onChange={e => setEditDriverHasScheduleExemption(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="editHasScheduleExemption" className="text-xs font-medium text-slate-700 cursor-pointer">
                Isenção de Horário de Trabalho (IHT) ativa
              </label>
            </div>

            {/* Carta e CAM */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Carta de Condução:</label>
                <input
                  type="text"
                  required
                  value={editDriverLicense}
                  onChange={e => setEditDriverLicense(e.target.value)}
                  placeholder="Ex: L-9482710"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {editDriverCategory === 'MISTO_PESADOS' ? (
                <div>
                  <label className="text-xs font-bold text-purple-700">Validade CAM:</label>
                  <input
                    type="date"
                    required
                    value={editDriverCamExpiry}
                    onChange={e => setEditDriverCamExpiry(e.target.value)}
                    className="w-full text-xs rounded-lg border border-purple-300 p-2 mt-1 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center text-xs text-slate-400 italic pt-6">
                  CAM não exigido para ligeiros
                </div>
              )}
            </div>

            {/* Telemóvel e Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Telemóvel:</label>
                <input
                  type="text"
                  value={editDriverPhone}
                  onChange={e => setEditDriverPhone(e.target.value)}
                  placeholder="+351 9..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Email:</label>
                <input
                  type="email"
                  value={editDriverEmail}
                  onChange={e => setEditDriverEmail(e.target.value)}
                  placeholder="motorista@..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Secção: Uso Interno / Fiscalização (Preenchimento Opcional) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Uso Interno / Fiscalização</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  Preenchimento Opcional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Data de Nascimento:</span>
                  </label>
                  <input
                    type="date"
                    value={editDriverBirthDate}
                    onChange={e => setEditDriverBirthDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nº Cartão Cidadão:</span>
                  </label>
                  <input
                    type="text"
                    value={editDriverCitizenCardNumber}
                    onChange={e => setEditDriverCitizenCardNumber(e.target.value)}
                    placeholder="Ex: 12849201 4 ZX9"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Número Fiscal (NIF):</span>
                  </label>
                  <input
                    type="text"
                    value={editDriverTaxNumber}
                    onChange={e => setEditDriverTaxNumber(e.target.value)}
                    placeholder="Ex: 219482019"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Endereço / Morada Fiscal:</span>
                </label>
                <input
                  type="text"
                  value={editDriverFiscalAddress}
                  onChange={e => setEditDriverFiscalAddress(e.target.value)}
                  placeholder="Ex: Av. da Liberdade, n.º 182, 3.º Dto, 1250-142 Lisboa"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                Apenas para consulta interna e eventual envio oficial a autoridades fiscalizadoras (IMT, ACT, AT). Por defeito, não é incluído em exportações gerais.
              </p>
            </div>

            {/* Botões do Rodapé */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => {
                  const driverToDel = editingDriver;
                  setEditingDriver(null);
                  setDriverToDelete(driverToDel);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Motorista</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações em Produção</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Confirm Delete Driver */}
      {driverToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Eliminar Motorista</h2>
                <p className="text-xs text-slate-500">Confirmação de eliminação de registo</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                Tem a certeza de que pretende eliminar o motorista{' '}
                <strong className="text-slate-900">{driverToDelete.name}</strong> ({driverToDelete.mechanicalNumber})?
              </p>

              {(() => {
                const assignedCount = allocations.filter(a => a.driverId === driverToDelete.id).length;
                if (assignedCount > 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Aviso: Motorista com serviços associados ({assignedCount})</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Este motorista possui <strong>{assignedCount} serviço(s)</strong> na escala operacional.
                        Para manter a integridade do histórico, recomendamos <strong>colocar o motorista no estado Inativo</strong> em vez de eliminar.
                      </p>
                    </div>
                  );
                }
                return (
                  <p className="text-slate-500 text-[11px]">
                    Esta ação removerá o motorista do sistema, juntamente com o seu registo de folgas e escalas associadas.
                  </p>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDriverToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>

              {allocations.some(a => a.driverId === driverToDelete.id) && (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStatus(driverToDelete);
                    setDriverToDelete(null);
                  }}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Apenas Desativar
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Eliminação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Vehicle */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Eliminar Veículo</h2>
                <p className="text-xs text-slate-500">Confirmação de eliminação de viatura da frota</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                Tem a certeza de que pretende eliminar o veículo com matrícula{' '}
                <strong className="text-slate-900 font-mono">{vehicleToDelete.plate}</strong> ({vehicleToDelete.brandModel})?
              </p>

              {(() => {
                const assignedCount = allocations.filter(a => a.vehicleId === vehicleToDelete.id).length;
                if (assignedCount > 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Aviso: Viatura com serviços associados ({assignedCount})</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Esta viatura possui <strong>{assignedCount} serviço(s)</strong> na escala operacional.
                        Para manter a integridade do histórico e escalas, recomendamos <strong>colocar a viatura no estado Inativo / Manutenção</strong> em vez de eliminar.
                      </p>
                    </div>
                  );
                }
                return (
                  <p className="text-slate-500 text-[11px]">
                    Esta ação removerá a viatura permanentemente da frota de produção e o registo deixará de estar disponível para novas alocações.
                  </p>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              {allocations.some(a => a.vehicleId === vehicleToDelete.id) && (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleVehicleStatus(vehicleToDelete);
                    setVehicleToDelete(null);
                  }}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Apenas Desativar
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmDeleteVehicle}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Eliminação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Toast Notification */}
      {saveToast?.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900 text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs max-w-md">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-100">{saveToast.message}</p>
              {saveToast.timestamp && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Salvo com persistência permanente às {saveToast.timestamp}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSaveToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

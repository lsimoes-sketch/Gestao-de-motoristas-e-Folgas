import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Car,
  Users,
  Truck,
  Calendar,
  Calculator,
  Database,
  Layers,
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
import {
  generateSystemBackupJSON,
  validateAndParseBackupJSON,
  exportDriversToCSV,
  exportVehiclesToCSV,
  exportServicesAndAllocationsToCSV,
  exportRosterToCSV,
  exportSettlementsToCSV,
  downloadFile,
  SystemBackupData,
} from '../utils/systemBackup';

interface SystemBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  services: TransportService[];
  allocations: Allocation[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  settlements: FreelancerSettlement[];
  onRestoreBackup?: (backupData: SystemBackupData) => void;
}

export const SystemBackupModal: React.FC<SystemBackupModalProps> = ({
  isOpen,
  onClose,
  drivers,
  vehicles,
  services,
  allocations,
  shiftScales,
  dayOffs,
  settlements,
  onRestoreBackup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'json' | 'csv' | 'restore'>('json');
  const [csvDelimiter, setCsvDelimiter] = useState<';' | ','>(';');
  const [includeFiscalData, setIncludeFiscalData] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore state
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<SystemBackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getTimestamp = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // JSON Handlers
  const handleDownloadJSON = () => {
    const jsonStr = generateSystemBackupJSON({
      drivers,
      vehicles,
      services,
      allocations,
      shiftScales,
      dayOffs,
      settlements,
    });
    const filename = `backup_sistema_transfers_${getTimestamp()}.json`;
    downloadFile(jsonStr, filename, 'application/json;charset=utf-8;');
    showToast(`Cópia de segurança JSON guardada: ${filename}`);
  };

  const handleCopyJSON = () => {
    const jsonStr = generateSystemBackupJSON({
      drivers,
      vehicles,
      services,
      allocations,
      shiftScales,
      dayOffs,
      settlements,
    });
    navigator.clipboard.writeText(jsonStr);
    setCopiedKey('json_all');
    setTimeout(() => setCopiedKey(null), 2500);
    showToast('Cópia de segurança completa copiada para a área de transferência!');
  };

  // CSV Handlers
  const handleDownloadDriversCSV = () => {
    const csv = exportDriversToCSV(drivers, {
      delimiter: csvDelimiter,
      includeFiscalDetails: includeFiscalData,
    });
    const filename = `motoristas_${getTimestamp()}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    showToast(`Ficheiro de motoristas descarregado: ${filename}`);
  };

  const handleDownloadVehiclesCSV = () => {
    const csv = exportVehiclesToCSV(vehicles, { delimiter: csvDelimiter });
    const filename = `veiculos_frota_${getTimestamp()}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    showToast(`Ficheiro de frota/veículos descarregado: ${filename}`);
  };

  const handleDownloadServicesCSV = () => {
    const csv = exportServicesAndAllocationsToCSV(services, allocations, drivers, vehicles, {
      delimiter: csvDelimiter,
      includeFiscalDetails: includeFiscalData,
    });
    const filename = `servicos_alocacoes_${getTimestamp()}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    showToast(`Ficheiro de serviços e alocações descarregado: ${filename}`);
  };

  const handleDownloadRosterCSV = () => {
    const csv = exportRosterToCSV(shiftScales, dayOffs, drivers, { delimiter: csvDelimiter });
    const filename = `folgas_escalas_${getTimestamp()}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    showToast(`Ficheiro de folgas e escalas descarregado: ${filename}`);
  };

  const handleDownloadSettlementsCSV = () => {
    const csv = exportSettlementsToCSV(settlements, allocations, services, drivers, { delimiter: csvDelimiter });
    const filename = `apuramento_freelancers_${getTimestamp()}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    showToast(`Ficheiro de apuramentos descarregado: ${filename}`);
  };

  const handleDownloadAllCSVSequential = () => {
    handleDownloadDriversCSV();
    setTimeout(() => handleDownloadVehiclesCSV(), 300);
    setTimeout(() => handleDownloadServicesCSV(), 600);
    setTimeout(() => handleDownloadRosterCSV(), 900);
    setTimeout(() => handleDownloadSettlementsCSV(), 1200);
    showToast('A transferir ficheiros CSV de todo o sistema (5 tabelas)...');
  };

  const handleCopyTableTSV = (tableType: 'drivers' | 'vehicles' | 'services', key: string) => {
    let tsv = '';
    if (tableType === 'drivers') {
      tsv = exportDriversToCSV(drivers, { delimiter: '\t', includeFiscalDetails: includeFiscalData }).replace(/^\uFEFF/, '');
    } else if (tableType === 'vehicles') {
      tsv = exportVehiclesToCSV(vehicles, { delimiter: '\t' }).replace(/^\uFEFF/, '');
    } else {
      tsv = exportServicesAndAllocationsToCSV(services, allocations, drivers, vehicles, {
        delimiter: '\t',
        includeFiscalDetails: includeFiscalData,
      }).replace(/^\uFEFF/, '');
    }
    navigator.clipboard.writeText(tsv);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
    showToast('Tabela copiada no formato TSV (pronta para colar no Excel ou Google Sheets)!');
  };

  // Restore Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setRestoreError(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setRestoreFileContent(content);
      const val = validateAndParseBackupJSON(content);
      if (val.valid && val.data) {
        setParsedBackup(val.data);
      } else {
        setParsedBackup(null);
        setRestoreError(val.error || 'Ficheiro JSON de cópia de segurança inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!parsedBackup || !onRestoreBackup) return;
    onRestoreBackup(parsedBackup);
    setRestoreSuccess(true);
    showToast('Dados do sistema restaurados com sucesso a partir da cópia de segurança!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Cópia de Segurança & Exportação Global
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Todo o Sistema
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exporte ficheiros em formato JSON e CSV dos motoristas, veículos, serviços e escalas operacionais.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toast Message */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Sub Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-2 bg-slate-50/40 gap-2">
          <button
            onClick={() => setActiveSubTab('json')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeSubTab === 'json'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Cópia de Segurança Completa (JSON)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('csv')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeSubTab === 'csv'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportação de Tabelas (CSV / Excel)</span>
          </button>
          {onRestoreBackup && (
            <button
              onClick={() => setActiveSubTab('restore')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'restore'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Restaurar Cópia (JSON)</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: JSON FULL BACKUP */}
          {activeSubTab === 'json' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-950">
                    Cópia de Segurança Integral (Snapshot Local)
                  </h3>
                  <p className="mt-1 text-blue-800 leading-relaxed">
                    O formato <strong>JSON</strong> exporta a totalidade das entidades e configurações do sistema
                    num único ficheiro autónomo. Permite guardar uma réplica exata do estado atual ou restaurar
                    posteriormente sem perda de relações.
                  </p>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Registo de Dados Incluídos no Backup Atual:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">{drivers.length}</div>
                      <div className="text-[11px] text-slate-500">Motoristas</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">{vehicles.length}</div>
                      <div className="text-[11px] text-slate-500">Veículos / Frota</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">{services.length}</div>
                      <div className="text-[11px] text-slate-500">Serviços</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">{allocations.length}</div>
                      <div className="text-[11px] text-slate-500">Alocações Ativas</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">{dayOffs.length}</div>
                      <div className="text-[11px] text-slate-500">Folgas / Ausências</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">{settlements.length}</div>
                      <div className="text-[11px] text-slate-500">Apuramentos Free-lancer</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Gerar e Guardar Ficheiro Local (.json)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    O ficheiro descarregado é compatível com o módulo de restauro e arquivo seguro.
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyJSON}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedKey === 'json_all' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descarregar Backup (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CSV TABLES EXPORT */}
          {activeSubTab === 'csv' && (
            <div className="space-y-5">
              {/* Export Options Toolbar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Definições do Formato CSV:</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Compatível com Microsoft Excel, Google Sheets e LibreOffice
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Delimitador de Colunas:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCsvDelimiter(';')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          csvDelimiter === ';'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Ponto e vírgula (;) — Portugal / UE Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsvDelimiter(',')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          csvDelimiter === ','
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Vírgula (,) — Internacional
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Dados de Fiscalização nos Motoristas:
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFiscalData}
                        onChange={e => setIncludeFiscalData(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span>Incluir NIF, CC, Data Nasc. e Morada Fiscal</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Master Download Action */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-blue-950">
                    Exportação Completa em Lote (Todas as Tabelas)
                  </div>
                  <div className="text-[11px] text-blue-800">
                    Descarrega os ficheiros CSV individuais de Motoristas, Veículos, Serviços, Folgas e Apuramentos.
                  </div>
                </div>
                <button
                  onClick={handleDownloadAllCSVSequential}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarregar Todos os CSV</span>
                </button>
              </div>

              {/* Individual Tables List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Descarregar Tabelas Específicas:
                </h4>

                {/* 1. Motoristas */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-0.5">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Motoristas</span>
                        <span className="text-[10px] px-2 py-0.2 font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                          {drivers.length} registos
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        ID, Nome, Nº Mecanográfico, Regime, IHT, Habilitação (Ligeiros/Pesados), Carta, CAM, Contactos
                        {includeFiscalData ? ' e dados de Fiscalização (NIF, CC, Morada Fiscal)' : ''}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopyTableTSV('drivers', 'csv_drivers')}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1"
                      title="Copiar para colar no Excel"
                    >
                      {copiedKey === 'csv_drivers' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                    <button
                      onClick={handleDownloadDriversCSV}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar CSV</span>
                    </button>
                  </div>
                </div>

                {/* 2. Veículos */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mt-0.5">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Veículos & Frota</span>
                        <span className="text-[10px] px-2 py-0.2 font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                          {vehicles.length} registos
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Matrícula, Marca e Modelo, Categoria (Ligeiro/Pesado), Lotação de Passageiros, Quilómetros e Estado.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopyTableTSV('vehicles', 'csv_vehicles')}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1"
                      title="Copiar para colar no Excel"
                    >
                      {copiedKey === 'csv_vehicles' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                    <button
                      onClick={handleDownloadVehiclesCSV}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar CSV</span>
                    </button>
                  </div>
                </div>

                {/* 3. Serviços & Alocações */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mt-0.5">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Serviços & Alocações</span>
                        <span className="text-[10px] px-2 py-0.2 font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                          {services.length} serviços / {allocations.length} alocações
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Código, Cliente, Pax, Origem, Destino, Horários, Duração, Categoria, Motorista, Viatura e Estado.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopyTableTSV('services', 'csv_services')}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1"
                      title="Copiar para colar no Excel"
                    >
                      {copiedKey === 'csv_services' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                    <button
                      onClick={handleDownloadServicesCSV}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar CSV</span>
                    </button>
                  </div>
                </div>

                {/* 4. Folgas & Escalas */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mt-0.5">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Mapa de Folgas & Escalas</span>
                        <span className="text-[10px] px-2 py-0.2 font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                          {dayOffs.length} registos
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Folgas rotativas automáticas, férias, baixas médicas e regras de fins de semana alternados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={handleDownloadRosterCSV}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar CSV</span>
                    </button>
                  </div>
                </div>

                {/* 5. Apuramentos Free-lancers */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-lg mt-0.5">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Apuramento de Free-lancers</span>
                        <span className="text-[10px] px-2 py-0.2 font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                          {settlements.length} apuramentos
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Pacotes 4h/8h, horas adicionais, valores base e liquidações totais efetuadas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={handleDownloadSettlementsCSV}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESTORE BACKUP */}
          {activeSubTab === 'restore' && onRestoreBackup && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-950">
                    Restaurar Dados a Partir de Cópia de Segurança JSON
                  </h3>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    A reposição substitui o estado local ativo pelos dados contidos no ficheiro JSON importado.
                    Certifique-se de que efetuou uma cópia prévia do estado atual antes de restaurar.
                  </p>
                </div>
              </div>

              {/* Upload Input Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {restoreFileName ? restoreFileName : 'Clique para selecionar o ficheiro de backup (.json)'}
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Selecione um ficheiro JSON gerado previamente por este sistema.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json,application/json"
                  className="hidden"
                />
              </div>

              {/* Error Box */}
              {restoreError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Preview of Validated Backup */}
              {parsedBackup && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Cópia de Segurança Válida Detetada
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Exportada em: {new Date(parsedBackup.exportedAt).toLocaleString('pt-PT')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-700">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Motoristas:</span>
                      <strong className="text-sm">{parsedBackup.drivers.length}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Veículos:</span>
                      <strong className="text-sm">{parsedBackup.vehicles.length}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Serviços:</span>
                      <strong className="text-sm">{parsedBackup.services.length}</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={restoreSuccess}
                      onClick={handleConfirmRestore}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${restoreSuccess ? 'animate-spin' : ''}`} />
                      <span>{restoreSuccess ? 'A Restaurar Dados...' : 'Confirmar e Restaurar Dados'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Processamento local no navegador — nenhum ficheiro é transferido para servidores externos.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { TransportService, Allocation, Driver, Vehicle } from '../types';
import {
  exportServicesToCSV,
  exportServicesToClipboardTSV,
  downloadFile,
} from '../utils/serviceExportImport';

interface ExportServicesModalProps {
  services: TransportService[];
  allocations: Allocation[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onClose: () => void;
  onOpenSystemBackup?: () => void;
}

export const ExportServicesModal: React.FC<ExportServicesModalProps> = ({
  services,
  allocations,
  drivers,
  vehicles,
  onClose,
  onOpenSystemBackup,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'CONFIRMADO' | 'CONCLUIDO'>('ALL');
  const [format, setFormat] = useState<'CSV_EXCEL' | 'CSV_STANDARD' | 'JSON'>('CSV_EXCEL');
  const [includeFiscalAddress, setIncludeFiscalAddress] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter services
  const filteredServices = services.filter(service => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDENTE') return service.status === 'PENDENTE';
    if (statusFilter === 'CONFIRMADO') return service.status === 'CONFIRMADO' || service.status === 'EM_CURSO';
    if (statusFilter === 'CONCLUIDO') return service.status === 'CONCLUIDO';
    return true;
  });

  const handleDownload = () => {
    const today = new Date().toISOString().split('T')[0];
    const prefix = includeFiscalAddress ? 'servicos_fiscalizacao_autoridades' : 'servicos_operacionais';

    if (format === 'JSON') {
      const dataToExport = filteredServices.map(service => {
        const alloc = allocations.find(a => a.serviceId === service.id);
        const driver = alloc ? drivers.find(d => d.id === alloc.driverId) : null;
        const vehicle = alloc ? vehicles.find(v => v.id === alloc.vehicleId) : null;
        return {
          ...service,
          assignedDriver: driver
            ? {
                id: driver.id,
                name: driver.name,
                regime: driver.regime,
                ...(includeFiscalAddress
                  ? {
                      taxNumber: driver.taxNumber || null,
                      citizenCardNumber: driver.citizenCardNumber || null,
                      birthDate: driver.birthDate || null,
                      fiscalAddress: driver.fiscalAddress || null,
                    }
                  : {}),
              }
            : null,
          assignedVehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate, model: vehicle.brandModel } : null,
        };
      });

      downloadFile(
        JSON.stringify(dataToExport, null, 2),
        `${prefix}_${today}.json`,
        'application/json;charset=utf-8;'
      );
    } else {
      const delimiter = format === 'CSV_EXCEL' ? ';' : ',';
      const csvContent = exportServicesToCSV(
        filteredServices,
        allocations,
        drivers,
        vehicles,
        delimiter,
        { includeFiscalAddress }
      );
      downloadFile(csvContent, `${prefix}_${today}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const handleCopyClipboard = () => {
    const tsvContent = exportServicesToClipboardTSV(
      filteredServices,
      allocations,
      drivers,
      vehicles,
      { includeFiscalAddress }
    );
    navigator.clipboard.writeText(tsvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Exportar Serviços de Transporte</h2>
              <p className="text-xs text-slate-500">
                Gere ficheiros compatíveis com Microsoft Excel, Google Sheets ou ERPs externos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filtrar Serviços a Exportar:</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'ALL', label: `Todos (${services.length})` },
              {
                id: 'PENDENTE',
                label: `Por Alocar (${services.filter(s => s.status === 'PENDENTE').length})`,
              },
              {
                id: 'CONFIRMADO',
                label: `Alocados (${services.filter(s => s.status === 'CONFIRMADO' || s.status === 'EM_CURSO').length})`,
              },
              {
                id: 'CONCLUIDO',
                label: `Concluídos (${services.filter(s => s.status === 'CONCLUIDO').length})`,
              },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Formato do Ficheiro:</label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setFormat('CSV_EXCEL')}
              className={`p-3 rounded-xl border text-left transition-all ${
                format === 'CSV_EXCEL'
                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>CSV Excel (PT)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Delimitador <code className="font-mono font-bold">;</code> e acentos UTF-8 BOM
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormat('CSV_STANDARD')}
              className={`p-3 rounded-xl border text-left transition-all ${
                format === 'CSV_STANDARD'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>CSV Padrão (Int.)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Delimitador <code className="font-mono font-bold">,</code> padrão universal
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormat('JSON')}
              className={`p-3 rounded-xl border text-left transition-all ${
                format === 'JSON'
                  ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <FileCode className="w-4 h-4 text-purple-600" />
                <span>JSON</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Dados estruturados com alocações</p>
            </button>
          </div>
        </div>

        {/* Data Protection & Authorities Inspection Toggle */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-950 block">
                Privacidade & Consulta Interna (Autoridades Fiscalizadoras)
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Os dados de identificação e fiscais do motorista (<strong>Data de Nascimento</strong>, <strong>Nº de Cartão de Cidadão</strong>, <strong>NIF</strong> e <strong>Endereço Fiscal</strong>) são dados confidenciais reservados a <strong>consulta interna</strong> e envio a <strong>autoridades fiscalizadoras</strong> (IMT, ACT, AT). Por defeito, são omitidos nas exportações operacionais.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none bg-white/80 p-2 rounded-lg border border-amber-200/80 hover:bg-white transition-colors">
            <input
              type="checkbox"
              checked={includeFiscalAddress}
              onChange={e => setIncludeFiscalAddress(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-slate-800">
              Incluir Dados de Fiscalização do Motorista (NIF, CC, Data Nasc. e Morada Fiscal)
            </span>
          </label>
        </div>

        {/* Live Export Preview Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>Resumo da Exportação:</span>
            <span className="text-blue-600">{filteredServices.length} serviços selecionados</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1">
            <span>Modo:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                includeFiscalAddress
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {includeFiscalAddress
                ? 'Fiscalização Oficial (Inclui Endereço Fiscal)'
                : 'Operacional / Comercial (Endereço Fiscal Omitido)'}
            </span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Inclui códigos, itinerários, horários, categoria exigida, motorista alocado e viatura.
          </p>

          {onOpenSystemBackup && (
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Deseja criar uma cópia de segurança completa de todo o sistema (motoristas, frota e serviços)?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSystemBackup();
                }}
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline shrink-0 ml-2"
              >
                Abrir Cópia de Segurança Global →
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado para a Área de Transferência!' : 'Copiar Tabela (Colar no Excel)'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={filteredServices.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Descarregar Ficheiro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Truck,
  Plus,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { TransportService } from '../types';
import {
  parseServicesFromCSV,
  generateSampleCSV,
  downloadFile,
  ParsedServiceRow,
} from '../utils/serviceExportImport';

interface ImportServicesModalProps {
  onImportServices: (newServices: TransportService[]) => void;
  onClose: () => void;
}

export const ImportServicesModal: React.FC<ImportServicesModalProps> = ({
  onImportServices,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [dragActive, setDragActive] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedServiceRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ line: number; message: string }[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessText = (text: string, sourceName?: string) => {
    if (!text.trim()) {
      setParsedRows([]);
      setParseErrors([]);
      return;
    }
    const result = parseServicesFromCSV(text);
    setParsedRows(result.successList);
    setParseErrors(result.errors);
    if (sourceName) setFileName(sourceName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const text = event.target?.result as string;
        handleProcessText(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const text = event.target?.result as string;
        handleProcessText(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generateSampleCSV(';');
    downloadFile(templateContent, 'modelo_importacao_servicos.csv', 'text/csv;charset=utf-8;');
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    const servicesToImport = parsedRows.map(r => r.service);
    onImportServices(servicesToImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Importar Serviços em Lote</h2>
              <p className="text-xs text-slate-500">
                Carregue múltiplos serviços em segundos a partir de ficheiro CSV ou copiar/colar do Excel.
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

        {/* Action Top Bar: Template Download & Method Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('FILE')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'FILE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ficheiro CSV / Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PASTE')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'PASTE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Colar do Excel / Sheets</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descarregar Modelo CSV</span>
          </button>
        </div>

        {/* Body based on tab */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {activeTab === 'FILE' ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? `Ficheiro Selecionado: ${fileName}` : 'Clique para selecionar ou arraste o ficheiro CSV'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Suporta ficheiros delimitados por ponto e vírgula (;), vírgula (,) ou tabulação com codificação UTF-8 ou Excel.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Cole abaixo as linhas copiadas da sua folha de cálculo:
              </label>
              <textarea
                value={pastedText}
                onChange={e => {
                  setPastedText(e.target.value);
                  handleProcessText(e.target.value, 'Texto Colado');
                }}
                placeholder="Codigo	Tipo	Cliente	Passageiros	Origem	Destino	Data	Hora..."
                rows={5}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Validation & Preview section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Pré-visualização: {parsedRows.length} serviços prontos para importação
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {parsedRows.filter(r => r.service.requiredCategory === 'PESADOS_PASSAGEIROS').length} requerem Pesados
                </span>
              </div>

              {/* Table preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 text-[11px] font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Ref</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Itinerário</th>
                      <th className="py-2 px-3">Data / Hora</th>
                      <th className="py-2 px-3">Pax</th>
                      <th className="py-2 px-3">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {row.service.code}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {row.service.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 truncate max-w-xs text-slate-600">
                          {row.service.origin} &rarr; {row.service.destination}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {row.service.scheduledStart.replace('T', ' ')}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-700">
                          {row.service.passengers}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.service.requiredCategory === 'PESADOS_PASSAGEIROS'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.service.requiredCategory === 'PESADOS_PASSAGEIROS' ? 'Pesados' : 'Ligeiros'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Avisos de processamento:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0
              ? `${parsedRows.length} registos serão adicionados ao planeamento ativo.`
              : 'Selecione um ficheiro ou cole o texto acima.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={parsedRows.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Importar {parsedRows.length > 0 ? `${parsedRows.length} Serviços` : 'Serviços'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

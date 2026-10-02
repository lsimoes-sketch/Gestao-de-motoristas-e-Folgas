import React, { useMemo, useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Ban,
  Truck,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { Driver, Vehicle, Allocation } from '../types';
import {
  readFirstSheet,
  parseAgendaRows,
  buildAgendaImport,
  matchDriver,
  normalizeName,
  AgendaParseResult,
  AgendaImportResult,
  STATUS_LABEL_PT,
} from '../utils/agendaImport';
import { formatDatePt } from '../utils/dates';

interface ImportAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  allocations: Allocation[];
  onImport: (result: AgendaImportResult) => void;
}

interface DriverRow {
  key: string;
  agendaName: string;
  partner: string;
  count: number;
  matchedId?: string;
  method: string;
}

const METHOD_LABEL: Record<string, string> = {
  nome: 'nome igual',
  abreviado: 'nome abreviado',
  associado: 'associado antes',
};

export const ImportAgendaModal: React.FC<ImportAgendaModalProps> = ({
  isOpen,
  onClose,
  drivers,
  vehicles,
  allocations,
  onImport,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<AgendaParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [createVehicles, setCreateVehicles] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(false);
  const [done, setDone] = useState<AgendaImportResult | null>(null);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setError(null);
    setChoices({});
    setDone(null);
    setCreateVehicles(true);
    setIncludeExternal(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const rows = readFirstSheet(buf);
      const result = parseAgendaRows(rows);
      if (result.lines.length === 0) {
        throw new Error('Não encontrei serviços no ficheiro. Confirme que é a exportação Excel da Agenda.');
      }
      // Escolhas por defeito: motorista reconhecido, ou criar ficha nova
      const initial: Record<string, string> = {};
      result.lines.forEach(l => {
        const key = normalizeName(l.driverName);
        if (!key || initial[key]) return;
        const m = matchDriver(l.driverName, drivers);
        initial[key] = m.driver ? m.driver.id : 'CRIAR';
      });
      setChoices(initial);
      setParsed(result);
      setFileName(file.name);
    } catch (err: any) {
      setParsed(null);
      setError(err?.message || 'Não foi possível ler o ficheiro.');
    } finally {
      setLoading(false);
    }
  };

  const driverRows: DriverRow[] = useMemo(() => {
    if (!parsed) return [];
    const map = new Map<string, DriverRow>();
    parsed.lines.forEach(l => {
      if (l.isExternalPartner && !includeExternal) return;
      const key = normalizeName(l.driverName);
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        return;
      }
      const m = matchDriver(l.driverName, drivers);
      map.set(key, {
        key,
        agendaName: l.driverName,
        partner: l.partner.trim(),
        count: 1,
        matchedId: m.driver?.id,
        method: m.method,
      });
    });
    return [...map.values()].sort((a, b) => {
      if (!!a.matchedId !== !!b.matchedId) return a.matchedId ? 1 : -1;
      return a.agendaName.localeCompare(b.agendaName);
    });
  }, [parsed, drivers, includeExternal]);

  const preview = useMemo(() => {
    if (!parsed) return null;
    return buildAgendaImport(
      parsed,
      drivers,
      vehicles,
      { driverChoices: choices, createMissingVehicles: createVehicles, includeExternalPartners: includeExternal },
      allocations
    );
  }, [parsed, drivers, vehicles, choices, createVehicles, includeExternal, allocations]);

  if (!isOpen) return null;

  const unmatchedRows = driverRows.filter(r => !r.matchedId);
  const matchedRows = driverRows.filter(r => r.matchedId);
  const externalCount = parsed?.lines.filter(l => l.isExternalPartner).length || 0;
  const statusCounts = parsed
    ? Object.entries(
        parsed.lines.reduce<Record<string, number>>((acc, l) => {
          acc[l.rawStatus] = (acc[l.rawStatus] || 0) + 1;
          return acc;
        }, {})
      )
    : [];
  const sortedDrivers = [...drivers].sort((a, b) => a.name.localeCompare(b.name));

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview);
    setDone(preview);
  };

  const driverSelect = (row: DriverRow) => (
    <select
      value={choices[row.key] || ''}
      onChange={e => setChoices(prev => ({ ...prev, [row.key]: e.target.value }))}
      className="w-full sm:w-64 px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
    >
      <option value="CRIAR">➕ Criar ficha nova</option>
      <option value="IGNORAR">🚫 Ignorar estes serviços</option>
      <optgroup label="Associar a motorista existente">
        {sortedDrivers.map(d => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.mechanicalNumber})
          </option>
        ))}
      </optgroup>
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Importar Agenda (Excel)</h2>
              <p className="text-xs text-slate-500">Exportação "Exportar Excel" da Agenda da plataforma Alliance4Drive</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {done ? (
            <div className="text-center space-y-3 py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Agenda importada</h3>
              <p className="text-sm text-slate-600">
                {done.services.length} serviços e {done.allocations.length} alocações de motorista
                {done.newDrivers.length > 0 && ` • ${done.newDrivers.length} fichas de motorista criadas`}
                {done.newVehicles.length > 0 && ` • ${done.newVehicles.length} viaturas criadas`}
                {done.ignoredCount > 0 && ` • ${done.ignoredCount} ignorados`}.
              </p>
              {done.newDrivers.some(d => d.regime === 'ASSALARIADO') && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 max-w-md mx-auto">
                  Os novos motoristas assalariados ainda não têm escala de folgas. Configure-a no Mapa de Escalas para a app
                  conseguir detetar conflitos com folgas.
                </p>
              )}
              <div className="flex justify-center gap-2 pt-2">
                <button onClick={reset} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-sm font-bold">
                  Importar outro dia
                </button>
                <button onClick={handleClose} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold">
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Ficheiro */}
              <label className="block border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-xl p-5 text-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                ) : (
                  <>
                    {fileName ? (
                      <FileSpreadsheet className="w-7 h-7 text-emerald-600 mx-auto mb-1" />
                    ) : (
                      <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                    )}
                    <p className="text-sm font-semibold text-slate-800">
                      {fileName || 'Escolher o ficheiro Excel exportado da Agenda'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fileName ? 'Clique para escolher outro ficheiro' : 'Na plataforma: Agenda → Exportar Excel'}
                    </p>
                  </>
                )}
              </label>

              {error && (
                <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{error}</span>
                </div>
              )}

              {parsed && preview && (
                <>
                  {/* 2. Resumo */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Dia</div>
                      <div className="text-sm font-bold text-slate-900">{parsed.dates.map(formatDatePt).join(', ')}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Serviços a importar</div>
                      <div className="text-sm font-bold text-slate-900">
                        {preview.services.length}
                        <span className="text-xs font-normal text-slate-500"> de {parsed.lines.length}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Motoristas</div>
                      <div className="text-sm font-bold text-slate-900">
                        {matchedRows.length} reconhecidos
                        {unmatchedRows.length > 0 && <span className="text-amber-700"> • {unmatchedRows.length} novos</span>}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Estados</div>
                      <div className="text-[11px] text-slate-700 leading-tight">
                        {statusCounts.map(([s, n]) => `${STATUS_LABEL_PT[s] || s || '—'}: ${n}`).join(' • ')}
                      </div>
                    </div>
                  </div>

                  {/* 3. Motoristas não reconhecidos */}
                  {unmatchedRows.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-amber-600" />
                        Motoristas sem ficha nesta app ({unmatchedRows.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Por defeito é criada uma ficha nova (free-lancer ou assalariado conforme o parceiro na agenda). Se for alguém
                        que já existe com outro nome, associe-o: a app passa a reconhecê-lo automaticamente.
                      </p>
                      <div className="border border-amber-200 rounded-xl divide-y divide-amber-100 bg-amber-50/30">
                        {unmatchedRows.map(r => (
                          <div key={r.key} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">{r.agendaName}</div>
                              <div className="text-[11px] text-slate-500">
                                {r.partner || 'Sem parceiro'} • {r.count} serviço{r.count > 1 ? 's' : ''}
                              </div>
                            </div>
                            {driverSelect(r)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Reconhecidos */}
                  {matchedRows.length > 0 && (
                    <details className="group">
                      <summary className="text-sm font-bold text-slate-900 cursor-pointer flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Motoristas reconhecidos ({matchedRows.length})
                        <span className="text-xs font-normal text-slate-500">— ver ou corrigir</span>
                      </summary>
                      <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {matchedRows.map(r => {
                          const d = drivers.find(x => x.id === r.matchedId);
                          return (
                            <div key={r.key} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900">
                                  {r.agendaName}
                                  {d && d.name !== r.agendaName && <span className="font-normal text-slate-500"> → {d.name}</span>}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {METHOD_LABEL[r.method] || r.method} • {r.count} serviço{r.count > 1 ? 's' : ''}
                                  {d && normalizeName(r.partner).includes('free') !== (d.regime === 'FREELANCER') && (
                                    <span className="text-amber-700">
                                      {' '}
                                      • na agenda é "{r.partner}", na ficha é {d.regime === 'FREELANCER' ? 'free-lancer' : 'assalariado'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {driverSelect(r)}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* 5. Opções */}
                  <div className="space-y-2 pt-1">
                    {(() => {
                      const missingPlates = new Set(parsed.lines.map(l => l.plate).filter(Boolean));
                      vehicles.forEach(v => missingPlates.delete(v.plate.toUpperCase()));
                      return missingPlates.size > 0 ? (
                        <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={createVehicles} onChange={e => setCreateVehicles(e.target.checked)} className="mt-0.5" />
                          <span>
                            <Truck className="w-3.5 h-3.5 inline text-slate-500 mr-1" />
                            Criar as <strong>{missingPlates.size} viaturas</strong> da agenda que ainda não existem na app (marca/modelo,
                            matrícula e tipo).
                          </span>
                        </label>
                      ) : null;
                    })()}
                    {externalCount > 0 && (
                      <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={includeExternal} onChange={e => setIncludeExternal(e.target.checked)} className="mt-0.5" />
                        <span>
                          <Ban className="w-3.5 h-3.5 inline text-slate-500 mr-1" />
                          Incluir {externalCount} serviço{externalCount > 1 ? 's' : ''} de parceiros externos (
                          {[...new Set(parsed.lines.filter(l => l.isExternalPartner).map(l => l.partner))].join(', ')}). Por defeito
                          ficam de fora, porque os motoristas não são da casa.
                        </span>
                      </label>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Importar o mesmo dia outra vez atualiza os serviços em vez de os duplicar. Não são importados nomes ou contactos de
                      passageiros nem preços.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Rodapé */}
        {!done && parsed && preview && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-600">
              {preview.services.length} serviços • {preview.allocations.length} com motorista
              {preview.newDrivers.length > 0 && ` • ${preview.newDrivers.length} fichas novas`}
              {preview.newVehicles.length > 0 && ` • ${preview.newVehicles.length} viaturas novas`}
            </span>
            <button
              onClick={handleConfirm}
              disabled={preview.services.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Importar {preview.services.length} serviços
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

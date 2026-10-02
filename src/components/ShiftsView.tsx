import React, { useMemo, useState } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  MapPin,
  PenLine,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Driver, TransportService, Allocation, WorkDayRecord } from '../types';
import { getDayShifts, getDayKind, getHolidayName, DriverDayShift, SHIFT_RULES_CONFIG } from '../utils/shiftRules';
import { getTodayStr, addDays, formatDatePt } from '../utils/dates';

export type ShiftEdge = 'start' | 'end';

interface ShiftsViewProps {
  drivers: Driver[];
  services: TransportService[];
  allocations: Allocation[];
  workDays: WorkDayRecord[];
  /** Grava (ou apaga, com value=null) o início/fim de jornada manual de um motorista num dia */
  onSetOverride: (driverId: string, date: string, edge: ShiftEdge, value: string | null) => void;
}

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function fmtLead(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)}h${rest ? String(rest).padStart(2, '0') : ''}`;
}

function hhmm(dateTime?: string): string {
  return dateTime ? dateTime.slice(11, 16) : '';
}

function durationLabel(from?: string, to?: string): string {
  if (!from || !to) return '—';
  const a = new Date(from + ':00Z').getTime();
  const b = new Date(to + ':00Z').getTime();
  const mins = Math.round((b - a) / 60000);
  if (!isFinite(mins) || mins <= 0) return '—';
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

/** "HH:mm" do início → data/hora (madrugada com início ao fim da tarde = dia anterior). */
function startToDateTime(shift: DriverDayShift, time: string): string {
  if (shift.first.scheduledStart.slice(11) < '06:00' && time >= '18:00') return `${addDays(shift.date, -1)}T${time}`;
  return `${shift.date}T${time}`;
}

/** "HH:mm" do fim → data/hora (hora anterior ao fim do último serviço = dia seguinte). */
function endToDateTime(shift: DriverDayShift, time: string): string {
  const lastEndDay = shift.lastEnd.slice(0, 10);
  const lastEndTime = shift.lastEnd.slice(11, 16);
  if (time < lastEndTime && lastEndTime >= '18:00' && time < '12:00') return `${addDays(lastEndDay, 1)}T${time}`;
  return `${lastEndDay}T${time}`;
}

const badgeBase = 'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border';

const StartBadge: React.FC<{ shift: DriverDayShift }> = ({ shift }) => {
  const { rule } = shift;
  const isTransfer = shift.first.type === 'TRANSFER';
  if (rule.kind === 'CHEGADA_AEROPORTO')
    return (
      <span className={`${badgeBase} bg-sky-100 text-sky-800 border-sky-200`}>
        <PlaneLanding className="w-3 h-3" /> {isTransfer ? 'Chegada aeroporto' : 'Início no aeroporto'} • −{fmtLead(rule.leadMinutes!)}
        {rule.peak ? ' (ponta)' : ''}
      </span>
    );
  if (rule.kind === 'SAIDA_LISBOA')
    return (
      <span className={`${badgeBase} bg-indigo-100 text-indigo-800 border-indigo-200`}>
        <PlaneTakeoff className="w-3 h-3" />{' '}
        {isTransfer && /aeroporto|airport/i.test(shift.first.destinationAddress || shift.first.destination) ? 'Saída Lisboa' : 'Início em Lisboa'} • −
        {fmtLead(rule.leadMinutes!)}
        {rule.peak ? ' (ponta)' : ''}
      </span>
    );
  return (
    <span className={`${badgeBase} bg-amber-100 text-amber-800 border-amber-200`}>
      <PenLine className="w-3 h-3" /> Início manual
    </span>
  );
};

const EndBadge: React.FC<{ shift: DriverDayShift }> = ({ shift }) => {
  const r = shift.endRule;
  if (r.kind === 'FIM_AEROPORTO')
    return (
      <span className={`${badgeBase} bg-sky-100 text-sky-800 border-sky-200`}>
        <PlaneTakeoff className="w-3 h-3" /> Termina no aeroporto • +{fmtLead(r.trailMinutes!)}
        {r.peak ? ' (ponta)' : ''}
      </span>
    );
  if (r.kind === 'FIM_LISBOA')
    return (
      <span className={`${badgeBase} bg-indigo-100 text-indigo-800 border-indigo-200`}>
        <MapPin className="w-3 h-3" /> Termina em Lisboa • +{fmtLead(r.trailMinutes!)}
        {r.peak ? ' (ponta)' : ''}
      </span>
    );
  return (
    <span className={`${badgeBase} bg-amber-100 text-amber-800 border-amber-200`}>
      <PenLine className="w-3 h-3" /> Fim manual
    </span>
  );
};

/** Célula com a hora de início ou de fim: mostra regra/manual e permite inserir ou corrigir. */
const TimeCell: React.FC<{
  effective?: string;
  calculated?: string;
  source: 'MANUAL' | 'REGRA' | 'PENDENTE';
  referenceDate: string;
  toDateTime: (time: string) => string;
  onSave: (value: string | null) => void;
}> = ({ effective, calculated, source, referenceDate, toDateTime, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(hhmm(effective));
  const needsInput = source === 'PENDENTE';

  const save = () => {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    onSave(toDateTime(value));
    setEditing(false);
  };

  if (needsInput || editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          className={`px-2 py-1 rounded-lg border text-sm font-mono w-[6.5rem] focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
            needsInput && !editing ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
          }`}
          autoFocus={editing}
        />
        <button
          onClick={save}
          disabled={!value}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold"
        >
          Gravar
        </button>
        {editing && (
          <button onClick={() => setEditing(false)} className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-800">
            Cancelar
          </button>
        )}
      </div>
    );
  }

  const otherDay = effective && effective.slice(0, 10) !== referenceDate;
  const dayNote = otherDay ? (effective! < referenceDate ? '(dia anterior)' : '(dia seguinte)') : '';
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-base font-bold text-slate-900">
        {hhmm(effective)}
        {dayNote && <span className="text-[10px] font-semibold text-slate-500 ml-1">{dayNote}</span>}
      </span>
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          source === 'MANUAL' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
        }`}
      >
        {source === 'MANUAL' ? 'manual' : 'regra'}
      </span>
      <button
        onClick={() => {
          setValue(hhmm(effective));
          setEditing(true);
        }}
        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        title={source === 'MANUAL' ? 'Alterar' : 'Corrigir manualmente (exceção)'}
      >
        <PenLine className="w-3.5 h-3.5" />
      </button>
      {source === 'MANUAL' && calculated && (
        <button
          onClick={() => onSave(null)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          title={`Repor o valor da regra (${hhmm(calculated)})`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export const ShiftsView: React.FC<ShiftsViewProps> = ({ drivers, services, allocations, workDays, onSetOverride }) => {
  const today = getTodayStr();
  const [date, setDate] = useState(today);
  const [onlyPending, setOnlyPending] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const shifts = useMemo(
    () => getDayShifts(date, services, allocations, drivers, workDays),
    [date, services, allocations, drivers, workDays]
  );

  const pendingStarts = shifts.filter(s => s.startSource === 'PENDENTE').length;
  const pendingEnds = shifts.filter(s => s.endSource === 'PENDENTE').length;
  const pending = shifts.filter(s => s.startSource === 'PENDENTE' || s.endSource === 'PENDENTE');
  const complete = shifts.filter(s => s.startSource !== 'PENDENTE' && s.endSource !== 'PENDENTE');
  const manualCount = shifts.filter(s => s.startSource === 'MANUAL' || s.endSource === 'MANUAL').length;
  const visible = onlyPending ? pending : shifts;

  const dayKind = getDayKind(date);
  const holiday = getHolidayName(date);
  const weekday = WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()];
  const cfg = SHIFT_RULES_CONFIG;
  const peakLabel = cfg.peakWindows.map(w => `${w.from}–${w.to}`).join(' e ');

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Jornadas dos Motoristas</h1>
          <p className="text-sm text-slate-500">
            Início e fim de jornada de cada motorista, calculados a partir do primeiro e do último serviço do dia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(addDays(date, -1))} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" title="Dia anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => e.target.value && setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold"
          />
          <button onClick={() => setDate(addDays(date, 1))} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" title="Dia seguinte">
            <ChevronRight className="w-4 h-4" />
          </button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="px-3 py-2 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50">
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Tipo de dia + resumo */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
            dayKind === 'UTIL'
              ? 'bg-slate-100 text-slate-800 border-slate-200'
              : dayKind === 'FERIADO'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-purple-50 text-purple-800 border-purple-200'
          }`}
        >
          {weekday}, {formatDatePt(date)} •{' '}
          {dayKind === 'UTIL' ? `dia útil (ponta ${peakLabel})` : dayKind === 'FERIADO' ? `feriado: ${holiday}` : 'fim de semana (sem hora de ponta)'}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
          <strong>{shifts.length}</strong> motoristas com serviço
        </span>
        <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
          <strong>{complete.length}</strong> jornadas completas
        </span>
        {manualCount > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <strong>{manualCount}</strong> com valores manuais
          </span>
        )}
        <button
          onClick={() => setOnlyPending(!onlyPending)}
          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
            pending.length === 0
              ? 'bg-white border-slate-200 text-slate-400 cursor-default'
              : onlyPending
              ? 'bg-amber-600 border-amber-600 text-white'
              : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
          }`}
          disabled={pending.length === 0}
        >
          {pending.length > 0
            ? `Por preencher: ${pendingStarts} início${pendingStarts === 1 ? '' : 's'} • ${pendingEnds} fi${pendingEnds === 1 ? 'm' : 'ns'}${
                onlyPending ? ' (a mostrar só estes)' : ''
              }`
            : 'Nada por preencher'}
        </button>
        <button onClick={() => setShowRules(!showRules)} className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> {showRules ? 'Esconder regras' : 'Ver regras'}
        </button>
      </div>

      {showRules && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
          <p className="font-bold text-slate-900">Início de jornada (primeiro serviço do dia: hora marcada, local de início)</p>
          <p>
            <PlaneLanding className="w-3.5 h-3.5 inline text-sky-600" /> <strong>Início no Aeroporto de Lisboa:</strong>{' '}
            {fmtLead(cfg.arrivalAirport.peakMinutes)} antes em hora de ponta; {fmtLead(cfg.arrivalAirport.offPeakMinutes)} nos restantes
            períodos, fins de semana e feriados.
          </p>
          <p>
            <PlaneTakeoff className="w-3.5 h-3.5 inline text-indigo-600" /> <strong>Início numa morada da cidade de Lisboa</strong> (qualquer
            destino): {fmtLead(cfg.departureLisbon.peakMinutes)} antes em hora de ponta; {fmtLead(cfg.departureLisbon.offPeakMinutes)} nos
            restantes períodos, fins de semana e feriados.
          </p>
          <p className="font-bold text-slate-900 pt-1">Fim de jornada (último serviço do dia: hora de fim, local onde termina)</p>
          <p>
            Os mesmos tempos, <strong>somados</strong> à hora de fim do último serviço (a real, quando a Agenda a tem; senão a prevista):
            termina no Aeroporto de Lisboa → +{fmtLead(cfg.arrivalAirport.peakMinutes)} / +{fmtLead(cfg.arrivalAirport.offPeakMinutes)};
            termina numa morada de Lisboa → +{fmtLead(cfg.departureLisbon.peakMinutes)} / +{fmtLead(cfg.departureLisbon.offPeakMinutes)}.
          </p>
          <p>
            Tours, disposições e outros serviços seguem as mesmas regras que os transfers, conforme o local.
          </p>
          <p>
            <Clock className="w-3.5 h-3.5 inline text-slate-500" /> <strong>Hora de ponta:</strong> dias úteis, {peakLabel} (inclusive). Feriados
            nacionais{cfg.includeLisbonMunicipalHoliday ? ' e Santo António (13/6)' : ''} e fins de semana contam como fora de ponta.
          </p>
          <p>
            <PenLine className="w-3.5 h-3.5 inline text-amber-600" /> <strong>Restantes casos</strong> (fora da cidade de Lisboa ou noutro
            aeroporto): inserir manualmente. Um valor manual prevalece sempre sobre o da regra.
          </p>
          <p className="text-slate-500">
            "Morada em Lisboa" = código postal 1000–1999 (concelho de Lisboa). Serviços importados sem morada completa: reimporte a Agenda
            desse dia.
          </p>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {shifts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Não há serviços com motorista atribuído neste dia. Importe a Agenda do dia em "Serviços & Alocações".
          </div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-emerald-700">
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2" />
            Todas as jornadas deste dia estão preenchidas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Motorista</th>
                  <th className="py-3 px-4">1.º serviço • regra</th>
                  <th className="py-3 px-4">Início</th>
                  <th className="py-3 px-4">Último serviço • regra</th>
                  <th className="py-3 px-4">Fim</th>
                  <th className="py-3 px-4 text-right">Jornada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(shift => {
                  const f = shift.first;
                  const l = shift.last;
                  const isPending = shift.startSource === 'PENDENTE' || shift.endSource === 'PENDENTE';
                  return (
                    <tr key={shift.driver.id} className={isPending ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'}>
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">{shift.driver.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {shift.driver.mechanicalNumber} • {shift.driver.regime === 'FREELANCER' ? 'Free-lancer' : 'Assalariado'} •{' '}
                          {shift.services.length} serviço{shift.services.length > 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Primeiro serviço + regra de início */}
                      <td className="py-3 px-4 align-top max-w-[15rem]">
                        <div className="font-mono font-bold text-slate-900">
                          {hhmm(f.scheduledStart)} <span className="text-xs font-semibold text-slate-500">{f.code}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate" title={`${f.originAddress || f.origin} → ${f.destinationAddress || f.destination}`}>
                          {f.origin} → {f.destination}
                        </div>
                        <div className="mt-1">
                          <StartBadge shift={shift} />
                        </div>
                        {shift.rule.kind === 'MANUAL' && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{shift.rule.explanation.replace('Inserir manualmente: ', '')}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <TimeCell
                          key={`s-${shift.driver.id}-${date}-${shift.effectiveStart || ''}`}
                          effective={shift.effectiveStart}
                          calculated={shift.rule.calculatedStart}
                          source={shift.startSource}
                          referenceDate={date}
                          toDateTime={t => startToDateTime(shift, t)}
                          onSave={v => onSetOverride(shift.driver.id, date, 'start', v)}
                        />
                        {shift.effectiveStart && shift.effectiveStart > f.scheduledStart && (
                          <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Depois do 1.º serviço
                          </div>
                        )}
                      </td>

                      {/* Último serviço + regra de fim */}
                      <td className="py-3 px-4 align-top max-w-[15rem]">
                        <div className="font-mono font-bold text-slate-900">
                          {hhmm(shift.lastEnd)}
                          {shift.lastEnd.slice(0, 10) !== date && <span className="text-[10px] text-slate-500 ml-0.5">(+1)</span>}{' '}
                          <span className="text-xs font-semibold text-slate-500">{l.code}</span>
                          <span className="text-[10px] font-semibold text-slate-400 ml-1">
                            {shift.endRule.serviceEndIsActual ? 'fim real' : 'fim previsto'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate" title={`${l.originAddress || l.origin} → ${l.destinationAddress || l.destination}`}>
                          {l.origin} → {l.destination}
                        </div>
                        <div className="mt-1">
                          <EndBadge shift={shift} />
                        </div>
                        {shift.endRule.kind === 'MANUAL' && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{shift.endRule.explanation.replace('Inserir manualmente: ', '')}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <TimeCell
                          key={`e-${shift.driver.id}-${date}-${shift.effectiveEnd || ''}`}
                          effective={shift.effectiveEnd}
                          calculated={shift.endRule.calculatedEnd}
                          source={shift.endSource}
                          referenceDate={date}
                          toDateTime={t => endToDateTime(shift, t)}
                          onSave={v => onSetOverride(shift.driver.id, date, 'end', v)}
                        />
                        {shift.effectiveEnd && shift.effectiveEnd < shift.lastEnd && (
                          <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Antes do fim do último serviço
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-right font-mono font-semibold text-slate-800">
                        {durationLabel(shift.effectiveStart, shift.effectiveEnd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        A duração da jornada vai do início ao fim de jornada (ainda sem pausas nem outras regras). O fim do último serviço usa a hora real quando
        existe na Agenda; caso contrário, a hora prevista.
      </p>
    </div>
  );
};

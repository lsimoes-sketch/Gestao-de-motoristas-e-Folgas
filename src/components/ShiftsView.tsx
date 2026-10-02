import React, { useMemo, useState } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  PenLine,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Driver, TransportService, Allocation, WorkDayRecord } from '../types';
import { getDayShifts, getDayKind, getHolidayName, DriverDayShift, SHIFT_RULES_CONFIG } from '../utils/shiftRules';
import { getTodayStr, addDays, formatDatePt } from '../utils/dates';

interface ShiftsViewProps {
  drivers: Driver[];
  services: TransportService[];
  allocations: Allocation[];
  workDays: WorkDayRecord[];
  /** Grava (ou apaga, com value=null) o início de jornada manual de um motorista num dia */
  onSetStartOverride: (driverId: string, date: string, value: string | null) => void;
}

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

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

/**
 * "HH:mm" → data/hora. Se o 1.º serviço é de madrugada (antes das 06:00) e a hora
 * inserida é ao fim do dia (18:00 ou depois), a jornada começou no dia anterior.
 */
function toStartDateTime(date: string, time: string, firstServiceStart: string): string {
  if (firstServiceStart.slice(11) < '06:00' && time >= '18:00') return `${addDays(date, -1)}T${time}`;
  return `${date}T${time}`;
}

const RuleBadge: React.FC<{ shift: DriverDayShift }> = ({ shift }) => {
  const { rule } = shift;
  const isTransfer = shift.first.type === 'TRANSFER';
  if (rule.kind === 'CHEGADA_AEROPORTO')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
        <PlaneLanding className="w-3 h-3" /> {isTransfer ? 'Chegada aeroporto' : 'Início no aeroporto'} • −{rule.leadMinutes} min{rule.peak ? ' (ponta)' : ''}
      </span>
    );
  if (rule.kind === 'SAIDA_LISBOA')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
        <PlaneTakeoff className="w-3 h-3" /> {isTransfer ? 'Saída Lisboa' : 'Início em Lisboa'} • −{rule.leadMinutes! >= 60 ? `${Math.floor(rule.leadMinutes! / 60)}h${rule.leadMinutes! % 60 ? rule.leadMinutes! % 60 : ''}` : `${rule.leadMinutes} min`}
        {rule.peak ? ' (ponta)' : ''}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
      <PenLine className="w-3 h-3" /> Início manual
    </span>
  );
};

const StartCell: React.FC<{
  shift: DriverDayShift;
  onSave: (value: string | null) => void;
}> = ({ shift, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(hhmm(shift.effectiveStart));
  const needsInput = shift.startSource === 'PENDENTE';

  const save = () => {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    onSave(toStartDateTime(shift.date, value, shift.first.scheduledStart));
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

  const prevDay = shift.effectiveStart && shift.effectiveStart.slice(0, 10) !== shift.date;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-base font-bold text-slate-900">
        {hhmm(shift.effectiveStart)}
        {prevDay && <span className="text-[10px] font-semibold text-slate-500 ml-1">(dia anterior)</span>}
      </span>
      {shift.startSource === 'MANUAL' ? (
        <>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">manual</span>
          <button
            onClick={() => {
              setValue(hhmm(shift.effectiveStart));
              setEditing(true);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Alterar"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
          {shift.rule.calculatedStart && (
            <button
              onClick={() => onSave(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title={`Repor o valor da regra (${hhmm(shift.rule.calculatedStart)})`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      ) : (
        <>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">regra</span>
          <button
            onClick={() => {
              setValue(hhmm(shift.effectiveStart));
              setEditing(true);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Corrigir manualmente (exceção)"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

export const ShiftsView: React.FC<ShiftsViewProps> = ({ drivers, services, allocations, workDays, onSetStartOverride }) => {
  const today = getTodayStr();
  const [date, setDate] = useState(today);
  const [onlyPending, setOnlyPending] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const shifts = useMemo(
    () => getDayShifts(date, services, allocations, drivers, workDays),
    [date, services, allocations, drivers, workDays]
  );

  const pending = shifts.filter(s => s.startSource === 'PENDENTE');
  const byRule = shifts.filter(s => s.startSource === 'REGRA');
  const manual = shifts.filter(s => s.startSource === 'MANUAL');
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
            Início de jornada de cada motorista, calculado a partir do primeiro serviço do dia.
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
          <strong>{byRule.length}</strong> pela regra
        </span>
        {manual.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <strong>{manual.length}</strong> manuais
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
          {pending.length > 0 ? `${pending.length} por preencher${onlyPending ? ' (a mostrar só estes)' : ''}` : 'Nada por preencher'}
        </button>
        <button onClick={() => setShowRules(!showRules)} className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> {showRules ? 'Esconder regras' : 'Ver regras'}
        </button>
      </div>

      {showRules && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
          <p className="font-bold text-slate-900">Regra de início de jornada (primeiro serviço do dia)</p>
          <p>
            <PlaneLanding className="w-3.5 h-3.5 inline text-sky-600" /> <strong>Transfer de chegada no Aeroporto de Lisboa:</strong>{' '}
            {cfg.arrivalAirport.peakMinutes} min antes em hora de ponta; {cfg.arrivalAirport.offPeakMinutes} min nos restantes períodos,
            fins de semana e feriados.
          </p>
          <p>
            <PlaneTakeoff className="w-3.5 h-3.5 inline text-indigo-600" /> <strong>Transfer de saída de uma morada em Lisboa:</strong> 1h30
            antes em hora de ponta; 1h nos restantes períodos, fins de semana e feriados.
          </p>
          <p>
            <strong>Tours, disposições e outros serviços que não são transfers</strong> seguem a mesma regra conforme onde começam: no
            Aeroporto de Lisboa, como uma chegada; numa morada da cidade de Lisboa, como uma saída.
          </p>
          <p>
            <Clock className="w-3.5 h-3.5 inline text-slate-500" /> <strong>Hora de ponta:</strong> dias úteis, {peakLabel} (hora marcada do
            serviço, inclusive). Feriados nacionais{cfg.includeLisbonMunicipalHoliday ? ' e Santo António (13/6)' : ''} contam como fora de
            ponta.
          </p>
          <p>
            <PenLine className="w-3.5 h-3.5 inline text-amber-600" /> <strong>Restantes casos</strong> (início fora da cidade de Lisboa,
            outros aeroportos, transfers em Lisboa sem destino aeroporto): inserir o início manualmente. Um valor manual prevalece sempre sobre o da regra.
          </p>
          <p className="text-slate-500">
            "Morada em Lisboa" = código postal 1000–1999 (concelho de Lisboa). Serviços importados antes desta versão não têm a morada
            completa: reimporte a Agenda desse dia para o cálculo ficar correto.
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
            Todos os inícios de jornada deste dia estão preenchidos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Motorista</th>
                  <th className="py-3 px-4">1.º serviço</th>
                  <th className="py-3 px-4">Regra</th>
                  <th className="py-3 px-4">Início de jornada</th>
                  <th className="py-3 px-4">Último fim</th>
                  <th className="py-3 px-4 text-right">Jornada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(shift => {
                  const f = shift.first;
                  return (
                    <tr
                      key={shift.driver.id}
                      className={shift.startSource === 'PENDENTE' ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'}
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">{shift.driver.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {shift.driver.mechanicalNumber} • {shift.driver.regime === 'FREELANCER' ? 'Free-lancer' : 'Assalariado'} •{' '}
                          {shift.services.length} serviço{shift.services.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-mono font-bold text-slate-900">
                          {hhmm(f.scheduledStart)} <span className="text-xs font-semibold text-slate-500">{f.code}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate" title={`${f.originAddress || f.origin} → ${f.destinationAddress || f.destination}`}>
                          {f.origin} → {f.destination}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <RuleBadge shift={shift} />
                        <div className="text-[11px] text-slate-500 mt-1 max-w-[16rem]">{shift.rule.explanation}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <StartCell
                          key={`${shift.driver.id}-${date}-${shift.effectiveStart || ''}`}
                          shift={shift}
                          onSave={value => onSetStartOverride(shift.driver.id, date, value)}
                        />
                        {shift.effectiveStart && shift.effectiveStart > f.scheduledStart && (
                          <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Depois do 1.º serviço ({hhmm(f.scheduledStart)})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top font-mono text-slate-700">
                        {hhmm(shift.lastEnd)}
                        {shift.lastEnd.slice(0, 10) !== date && <span className="text-[10px] text-slate-500 ml-1">(+1)</span>}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono font-semibold text-slate-800">
                        {durationLabel(shift.effectiveStart, shift.lastEnd)}
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
        "Último fim" usa a hora real de fim quando existe na Agenda; caso contrário, a hora prevista. A duração da jornada é informativa
        (ainda sem pausas nem outras regras).
      </p>
    </div>
  );
};

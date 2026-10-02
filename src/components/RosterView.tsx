import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Palmtree,
  Stethoscope,
  Info,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Driver, ShiftScaleConfig, DayOffRecord } from '../types';
import { getDriverDayStatus } from '../utils/rulesEngine';

interface RosterViewProps {
  drivers: Driver[];
  shiftScales: ShiftScaleConfig[];
  dayOffs: DayOffRecord[];
  onToggleDayOff: (driverId: string, date: string, type: 'FERIAS' | 'BAIXA_MEDICA' | 'FOLGA_ROTATIVA') => void;
  onUpdateScale: (scale: ShiftScaleConfig) => void;
}

export interface WeekOption {
  id: string;
  label: string;
  subLabel: string;
  startDate: string; // '2026-09-07' (Segunda)
  endDate: string; // '2026-09-13' (Domingo)
  startDayNum: number;
}

const AVAILABLE_WEEKS: WeekOption[] = [
  {
    id: 'week-36',
    label: 'Semana 36',
    subLabel: '31 Ago – 06 Set 2026',
    startDate: '2026-08-31',
    endDate: '2026-09-06',
    startDayNum: 1,
  },
  {
    id: 'week-37',
    label: 'Semana 37 (Atual)',
    subLabel: '07 Set – 13 Set 2026',
    startDate: '2026-09-07',
    endDate: '2026-09-13',
    startDayNum: 7,
  },
  {
    id: 'week-38',
    label: 'Semana 38',
    subLabel: '14 Set – 20 Set 2026',
    startDate: '2026-09-14',
    endDate: '2026-09-20',
    startDayNum: 14,
  },
  {
    id: 'week-39',
    label: 'Semana 39',
    subLabel: '21 Set – 27 Set 2026',
    startDate: '2026-09-21',
    endDate: '2026-09-27',
    startDayNum: 21,
  },
  {
    id: 'week-40',
    label: 'Semana 40',
    subLabel: '28 Set – 04 Out 2026',
    startDate: '2026-09-28',
    endDate: '2026-10-04',
    startDayNum: 28,
  },
];

export const RosterView: React.FC<RosterViewProps> = ({
  drivers,
  shiftScales,
  dayOffs,
  onToggleDayOff,
  onUpdateScale,
}) => {
  // Only salaried drivers have rotating day-offs with IHT
  const salariedDrivers = drivers.filter(d => d.regime === 'ASSALARIADO');

  // Days to show: 15 days window centered on Sep 11-25, 2026
  const baseYear = 2026;
  const baseMonth = 9; // September
  const [startDay, setStartDay] = useState(8); // Showing from Sep 8 to Sep 22
  const daysCount = 15;

  const dateList: string[] = [];
  for (let i = 0; i < daysCount; i++) {
    const day = startDay + i;
    const formattedDay = String(day).padStart(2, '0');
    dateList.push(`2026-09-${formattedDay}`);
  }

  // Selected driver for detail inspector
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    salariedDrivers[0]?.id || ''
  );

  const selectedDriver = salariedDrivers.find(d => d.id === selectedDriverId);
  const selectedScale = shiftScales.find(s => s.driverId === selectedDriverId);

  // Selected week state for the comparative bar chart
  const [selectedWeekId, setSelectedWeekId] = useState<string>('week-37');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(true);

  const currentWeekIndex = AVAILABLE_WEEKS.findIndex(w => w.id === selectedWeekId);
  const selectedWeek = currentWeekIndex >= 0 ? AVAILABLE_WEEKS[currentWeekIndex] : AVAILABLE_WEEKS[1];

  const goToPrevWeek = () => {
    if (currentWeekIndex > 0) {
      setSelectedWeekId(AVAILABLE_WEEKS[currentWeekIndex - 1].id);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < AVAILABLE_WEEKS.length - 1) {
      setSelectedWeekId(AVAILABLE_WEEKS[currentWeekIndex + 1].id);
    }
  };

  // 7 days of the selected week
  const weekDays = useMemo(() => {
    const days: { dateStr: string; dayName: string; dayKey: string; isWeekend: boolean }[] = [];
    const start = new Date(selectedWeek.startDate + 'T00:00:00');
    const dayNamesShort = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const dayNamesFull = [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo',
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      days.push({
        dateStr,
        dayName: dayNamesFull[i],
        dayKey: `${dayNamesShort[i]} (${dd})`,
        isWeekend,
      });
    }
    return days;
  }, [selectedWeek]);

  // Calculate daily comparison metrics for the bar chart
  const weeklyChartData = useMemo(() => {
    return weekDays.map(day => {
      let activeDriversCount = 0;
      let dayOffsCount = 0;
      let rotativeOffCount = 0;
      let vacationCount = 0;
      let medicalCount = 0;

      const activeDriversNames: string[] = [];
      const offDriversDetails: { name: string; type: string; label: string }[] = [];

      salariedDrivers.forEach(driver => {
        const status = getDriverDayStatus(driver.id, day.dateStr, dayOffs, shiftScales);
        if (status.isDayOff) {
          dayOffsCount++;
          if (status.type === 'FERIAS') vacationCount++;
          else if (status.type === 'BAIXA_MEDICA') medicalCount++;
          else rotativeOffCount++;

          offDriversDetails.push({
            name: driver.name,
            type: status.type,
            label: status.label,
          });
        } else {
          activeDriversCount++;
          activeDriversNames.push(driver.name);
        }
      });

      const totalSalaried = salariedDrivers.length;
      const activeRate = totalSalaried > 0 ? Math.round((activeDriversCount / totalSalaried) * 100) : 0;

      return {
        dayKey: day.dayKey,
        dayName: day.dayName,
        dateStr: day.dateStr,
        isWeekend: day.isWeekend,
        isToday: day.dateStr === '2026-09-12',
        activeDrivers: activeDriversCount,
        dayOffs: dayOffsCount,
        totalDrivers: totalSalaried,
        activeRate,
        activeDriversNames,
        offDriversDetails,
        rotativeOffCount,
        vacationCount,
        medicalCount,
      };
    });
  }, [weekDays, salariedDrivers, dayOffs, shiftScales]);

  // Executive summary metrics across the selected week
  const summaryMetrics = useMemo(() => {
    if (weeklyChartData.length === 0) {
      return {
        avgActive: '0.0',
        totalActive: 0,
        totalOffs: 0,
        minActiveDay: null,
        maxActiveDay: null,
      };
    }

    const totalActive = weeklyChartData.reduce((acc, curr) => acc + curr.activeDrivers, 0);
    const totalOffs = weeklyChartData.reduce((acc, curr) => acc + curr.dayOffs, 0);
    const avgActive = (totalActive / weeklyChartData.length).toFixed(1);

    let minDay = weeklyChartData[0];
    let maxDay = weeklyChartData[0];

    weeklyChartData.forEach(d => {
      if (d.activeDrivers < minDay.activeDrivers) minDay = d;
      if (d.activeDrivers > maxDay.activeDrivers) maxDay = d;
    });

    return {
      avgActive,
      totalActive,
      totalOffs,
      minActiveDay: minDay,
      maxActiveDay: maxDay,
    };
  }, [weeklyChartData]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>Escalas Rotativas & Isenção de Horário (IHT)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Mapa de Folgas dos Motoristas Assalariados
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Padrão em vigor: <strong>Rotação mensal personalizada com fins-de-semana alternados</strong>.
            Garante descanso ao fim de semana a cada 2 semanas e folgas rotativas em dias úteis nas restantes.
            Clique em qualquer dia para registar Férias, Baixa ou personalizar folgas manuais.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md font-medium border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            Folga FDS / Rotativa
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-medium border border-emerald-200">
            <Palmtree className="w-3 h-3 text-emerald-600" />
            Férias
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-medium border border-amber-200">
            <Stethoscope className="w-3 h-3 text-amber-600" />
            Baixa Médica
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Em Escala (Serviço)
          </span>
        </div>
      </div>

      {/* Weekly Comparative Bar Chart: Active Drivers vs Planned Days Off */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Header & Week Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-purple-600 text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Análise de Cobertura e Disponibilidade</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Comparativo Semanal: Motoristas em Atividade vs. Folgas Previstas</span>
              <span className="text-xs font-normal text-slate-500">
                ({salariedDrivers.length} Motoristas Assalariados c/ IHT)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize a distribuição diária de condutores disponíveis para serviços em contraste com folgas rotativas e ausências.
            </p>
          </div>

          {/* Week Selector Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={goToPrevWeek}
                disabled={currentWeekIndex <= 0}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2">
                <select
                  value={selectedWeekId}
                  onChange={e => setSelectedWeekId(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-800 border-none outline-none py-1 cursor-pointer"
                >
                  {AVAILABLE_WEEKS.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.label} ({w.subLabel})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={goToNextWeek}
                disabled={currentWeekIndex >= AVAILABLE_WEEKS.length - 1}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Semana Seguinte"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick sync with table */}
            <button
              type="button"
              onClick={() => {
                setStartDay(selectedWeek.startDayNum);
              }}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Ajustar o calendário detalhado abaixo para iniciar no primeiro dia desta semana"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver no Calendário</span>
            </button>

            {/* Toggle collapse */}
            <button
              type="button"
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-medium cursor-pointer"
            >
              {isChartExpanded ? 'Minimizar' : 'Expandir'}
            </button>
          </div>
        </div>

        {isChartExpanded && (
          <>
            {/* KPI Metric Highlights for the selected week */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Metric 1 */}
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center justify-between text-blue-600 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Média Ativa / Dia</span>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-blue-950">
                  {summaryMetrics.avgActive}{' '}
                  <span className="text-xs font-normal text-blue-700">motoristas</span>
                </div>
                <div className="text-[10px] text-blue-600/90 mt-0.5 font-medium">
                  {Math.round((Number(summaryMetrics.avgActive) / (salariedDrivers.length || 1)) * 100)}% da frota assalariada
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Turnos Programados</span>
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-emerald-950">
                  {summaryMetrics.totalActive}{' '}
                  <span className="text-xs font-normal text-emerald-700">dias de serviço</span>
                </div>
                <div className="text-[10px] text-emerald-600/90 mt-0.5 font-medium">
                  Disponibilidade semanal total
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100">
                <div className="flex items-center justify-between text-purple-600 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Folgas & Ausências</span>
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-purple-950">
                  {summaryMetrics.totalOffs}{' '}
                  <span className="text-xs font-normal text-purple-700">descansos</span>
                </div>
                <div className="text-[10px] text-purple-600/90 mt-0.5 font-medium">
                  Rotativas, fins-de-semana e férias
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Picos de Escala</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {summaryMetrics.maxActiveDay ? (
                    <span>
                      Máx: {summaryMetrics.maxActiveDay.dayKey.split(' ')[0]} ({summaryMetrics.maxActiveDay.activeDrivers})
                    </span>
                  ) : '-'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {summaryMetrics.minActiveDay ? (
                    <span>
                      Mín: {summaryMetrics.minActiveDay.dayKey.split(' ')[0]} ({summaryMetrics.minActiveDay.activeDrivers})
                    </span>
                  ) : '-'}
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="pt-2">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyChartData}
                    margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
                    barGap={6}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dayKey"
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, Math.max(salariedDrivers.length, 6)]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0]?.payload;
                        if (!data) return null;

                        return (
                          <div className="bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs max-w-xs space-y-2.5 z-50">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{data.dayName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{data.dateStr}</div>
                              </div>
                              {data.isToday && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                  Hoje
                                </span>
                              )}
                            </div>

                            {/* Active Section */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-blue-700 font-bold">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                  Em Atividade ({data.activeDrivers})
                                </span>
                                <span className="text-[11px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 font-mono">
                                  {data.activeRate}% frota
                                </span>
                              </div>
                              {data.activeDriversNames.length > 0 ? (
                                <div className="text-[11px] text-slate-600 pl-4 space-y-0.5">
                                  {data.activeDriversNames.map((name: string) => (
                                    <div key={name} className="truncate">• {name}</div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 pl-4 italic">Nenhum motorista disponível</div>
                              )}
                            </div>

                            {/* Day Offs Section */}
                            <div className="space-y-1 pt-1.5 border-t border-slate-100">
                              <div className="flex items-center justify-between text-purple-700 font-bold">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                                  Folgas & Ausências ({data.dayOffs})
                                </span>
                                <div className="flex items-center gap-1 text-[10px]">
                                  {data.rotativeOffCount > 0 && (
                                    <span className="text-purple-600 font-medium">{data.rotativeOffCount} folga</span>
                                  )}
                                  {data.vacationCount > 0 && (
                                    <span className="text-emerald-600 font-medium">+{data.vacationCount} fér</span>
                                  )}
                                  {data.medicalCount > 0 && (
                                    <span className="text-amber-600 font-medium">+{data.medicalCount} baixa</span>
                                  )}
                                </div>
                              </div>
                              {data.offDriversDetails.length > 0 ? (
                                <div className="text-[11px] text-slate-600 pl-4 space-y-0.5">
                                  {data.offDriversDetails.map((off: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between gap-1">
                                      <span className="truncate">• {off.name}</span>
                                      <span
                                        className={`text-[9px] font-bold px-1 rounded shrink-0 ${
                                          off.type === 'FERIAS'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : off.type === 'BAIXA_MEDICA'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}
                                      >
                                        {off.type === 'FERIAS' ? 'FÉRIAS' : off.type === 'BAIXA_MEDICA' ? 'BAIXA' : 'FOLGA'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 pl-4 italic">Sem folgas previstas</div>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    />
                    <ReferenceLine
                      y={Number(summaryMetrics.avgActive)}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{
                        value: `Média: ${summaryMetrics.avgActive}`,
                        fill: '#64748b',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <Bar
                      dataKey="activeDrivers"
                      name="Motoristas em Atividade"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                    <Bar
                      dataKey="dayOffs"
                      name="Folgas Previstas"
                      fill="#8b5cf6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Summary Cards Strip */}
            <div className="grid grid-cols-7 gap-2 pt-2 border-t border-slate-100 text-center">
              {weeklyChartData.map(day => (
                <div
                  key={day.dateStr}
                  className={`p-2 rounded-xl border transition-all ${
                    day.isToday
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                      : day.isWeekend
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-700 truncate">
                    {day.dayKey.split(' ')[0]}
                  </div>
                  <div className={`text-xs font-mono font-bold ${day.isToday ? 'text-blue-700' : 'text-slate-500'}`}>
                    {day.dayKey.split(' ')[1]?.replace(/[()]/g, '')}
                  </div>

                  {/* Micro Stack Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex my-1.5">
                    <div
                      className="bg-blue-600 h-full"
                      style={{ width: `${day.activeRate}%` }}
                      title={`${day.activeDrivers} em atividade`}
                    />
                    <div
                      className="bg-purple-500 h-full"
                      style={{ width: `${100 - day.activeRate}%` }}
                      title={`${day.dayOffs} em folga`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold px-0.5">
                    <span className="text-blue-700" title="Ativos">{day.activeDrivers}A</span>
                    <span className="text-purple-700" title="Folgas">{day.dayOffs}F</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs text-sm">
        <button
          onClick={() => setStartDay(Math.max(1, startDay - 7))}
          disabled={startDay <= 1}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 flex items-center gap-1 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>7 Dias Anteriores</span>
        </button>

        <span className="font-bold text-slate-800 text-sm">
          Setembro 2026: Dia {startDay} a Dia {startDay + daysCount - 1}
        </span>

        <button
          onClick={() => setStartDay(Math.min(16, startDay + 7))}
          disabled={startDay >= 16}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 flex items-center gap-1 text-xs font-semibold"
        >
          <span>7 Dias Seguintes</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Matrix / Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="p-3 sticky left-0 bg-slate-50 z-10 w-48 border-r border-slate-200">
                Motorista (IHT)
              </th>
              {dateList.map(dateStr => {
                const dayNum = dateStr.split('-')[2];
                const dateObj = new Date(dateStr + 'T00:00:00');
                const weekDay = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()];
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isToday = dateStr === '2026-09-12';

                return (
                  <th
                    key={dateStr}
                    className={`p-2 text-center min-w-[54px] border-r border-slate-100 ${
                      isToday
                        ? 'bg-blue-100/60 text-blue-900 font-bold'
                        : isWeekend
                        ? 'bg-slate-100/60 text-slate-700'
                        : 'text-slate-600'
                    }`}
                  >
                    <div>{weekDay}</div>
                    <div className={`text-sm ${isToday ? 'font-black text-blue-700' : 'font-bold'}`}>
                      {dayNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salariedDrivers.map(driver => {
              const scale = shiftScales.find(s => s.driverId === driver.id);
              const isSelected = driver.id === selectedDriverId;

              return (
                <tr
                  key={driver.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    isSelected ? 'bg-blue-50/20' : ''
                  }`}
                >
                  {/* Driver Name Column */}
                  <td
                    onClick={() => setSelectedDriverId(driver.id)}
                    className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 cursor-pointer shadow-xs"
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{driver.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                        {scale?.cycleType === 'MENSAL_FDS_ALTERNADO' ? 'FDS Alternado' : scale?.cycleType || '6x2'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {driver.category === 'MISTO_PESADOS' ? 'Ligeiros + Pesados' : 'Apenas Ligeiros'}
                    </div>
                  </td>

                  {/* Day Cells */}
                  {dateList.map(dateStr => {
                    const status = getDriverDayStatus(driver.id, dateStr, dayOffs, shiftScales);
                    const isToday = dateStr === '2026-09-12';
                    const dateObj = new Date(dateStr + 'T00:00:00');
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    let cellStyle = 'bg-white text-slate-700 hover:bg-slate-100';
                    let badge = <span className="text-[10px] font-semibold text-slate-400">TRAB</span>;

                    if (status.type === 'FOLGA_ROTATIVA') {
                      const isFdsFolga = isWeekend || status.label.includes('Fim-de-Semana');
                      cellStyle = isFdsFolga
                        ? 'bg-purple-100/90 text-purple-950 border-purple-300 hover:bg-purple-200 font-bold'
                        : 'bg-indigo-100/80 text-indigo-950 border-indigo-200 hover:bg-indigo-200';
                      badge = (
                        <span className={`text-[10px] font-bold ${isFdsFolga ? 'text-purple-800' : 'text-indigo-800'}`}>
                          {isFdsFolga ? 'FDS FOLGA' : 'FOLGA'}
                        </span>
                      );
                    } else if (status.type === 'FERIAS') {
                      cellStyle =
                        'bg-emerald-100/80 text-emerald-900 border-emerald-200 hover:bg-emerald-200';
                      badge = (
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                          <Palmtree className="w-2.5 h-2.5" /> FÉR
                        </span>
                      );
                    } else if (status.type === 'BAIXA_MEDICA') {
                      cellStyle =
                        'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200';
                      badge = (
                        <span className="text-[10px] font-bold text-amber-800">BAIXA</span>
                      );
                    } else if (isWeekend && status.type === 'TRABALHO') {
                      badge = <span className="text-[10px] font-bold text-blue-600">FDS TRAB</span>;
                    }

                    return (
                      <td
                        key={dateStr}
                        onClick={() => {
                          // Quick toggle through types
                          const nextType =
                            status.type === 'FERIAS'
                              ? 'BAIXA_MEDICA'
                              : status.type === 'BAIXA_MEDICA'
                              ? 'FOLGA_ROTATIVA'
                              : 'FERIAS';
                          onToggleDayOff(driver.id, dateStr, nextType);
                        }}
                        title={`${driver.name} em ${dateStr}: ${status.label} (Clique para alterar)`}
                        className={`p-1.5 text-center border-r border-slate-100 cursor-pointer transition-all ${cellStyle} ${
                          isToday ? 'ring-2 ring-blue-500 ring-inset' : ''
                        }`}
                      >
                        <div className="py-1 px-0.5 rounded flex items-center justify-center">
                          {badge}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Driver Shift Scale Inspector & Cycle Editor */}
      {selectedDriver && selectedScale && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Configuração de Escala Rotativa
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {selectedDriver.name} ({selectedDriver.mechanicalNumber})
              </h2>
              <p className="text-xs text-slate-500">
                Regime: <strong>Assalariado com Isenção de Horário de Trabalho</strong> • Carta:{' '}
                <strong>{selectedDriver.licenseNumber}</strong>
              </p>
            </div>

            {/* Cycle Preset Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Padrão de Rotação:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateScale({
                      ...selectedScale,
                      cycleType: 'MENSAL_FDS_ALTERNADO',
                      workDays: 5,
                      offDays: 2,
                      weekendOffPattern: selectedScale.weekendOffPattern || 'SEMANAS_IMPARES',
                      weekdayOffDays: selectedScale.weekdayOffDays || [2, 3],
                    });
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    selectedScale.cycleType === 'MENSAL_FDS_ALTERNADO'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mensal c/ FDS Alternados (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateScale({
                      ...selectedScale,
                      cycleType: '6x2',
                      workDays: 6,
                      offDays: 2,
                    });
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    selectedScale.cycleType === '6x2'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  6x2 Móvel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateScale({
                      ...selectedScale,
                      cycleType: '5x2',
                      workDays: 5,
                      offDays: 2,
                    });
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    selectedScale.cycleType === '5x2'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  5x2 Fixo
                </button>
              </div>
            </div>
          </div>

          {/* Sub-controls when MENSAL_FDS_ALTERNADO is active */}
          {selectedScale.cycleType === 'MENSAL_FDS_ALTERNADO' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-purple-50/60 rounded-xl border border-purple-200">
              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">
                  1. Alternância de Fins-de-Semana Livres:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateScale({
                        ...selectedScale,
                        weekendOffPattern: 'SEMANAS_IMPARES',
                      })
                    }
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      selectedScale.weekendOffPattern !== 'SEMANAS_PARES'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Semanas Ímpares (ex: 12-13 Set)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateScale({
                        ...selectedScale,
                        weekendOffPattern: 'SEMANAS_PARES',
                      })
                    }
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      selectedScale.weekendOffPattern === 'SEMANAS_PARES'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Semanas Pares (ex: 19-20 Set)
                  </button>
                </div>
                <p className="text-[11px] text-purple-800 mt-1">
                  Alterna motoristas entre turmas para garantir 100% de cobertura operacional de carrinhas/autocarros ao fim de semana.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">
                  2. Folgas Úteis (na semana em que trabalha ao FDS):
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Terça + Quarta', days: [2, 3] as [number, number] },
                    { label: 'Quinta + Sexta', days: [4, 5] as [number, number] },
                    { label: 'Segunda + Terça', days: [1, 2] as [number, number] },
                  ].map(opt => {
                    const isSelected =
                      selectedScale.weekdayOffDays &&
                      selectedScale.weekdayOffDays[0] === opt.days[0] &&
                      selectedScale.weekdayOffDays[1] === opt.days[1];
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() =>
                          onUpdateScale({
                            ...selectedScale,
                            weekdayOffDays: opt.days,
                          })
                        }
                        className={`py-1 px-1.5 text-xs font-bold rounded-lg border text-center transition-colors ${
                          isSelected
                            ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-purple-800 mt-1">
                  Dias consecutivos de descanso semanal compensatório obrigatório para repouso do motorista.
                </p>
              </div>
            </div>
          )}

          {/* Explanation of rotation formula */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                Regra Confirmada: Rotação Mensal com Fins-de-Semana Alternados + Personalização
              </div>
              <p>
                O motorista beneficia de fins-de-semana alternados de descanso (Sábado e Domingo). Nas semanas em que presta serviço ao fim de semana, goza as suas duas folgas semanais nos dias úteis definidos.
              </p>
              <p className="text-slate-500">
                <strong>Personalização Manual:</strong> Ao clicar diretamente em qualquer dia no calendário acima, pode registar Férias, Baixa Médica ou efetuar troca de folgas pontuais sem alterar a rotação base.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

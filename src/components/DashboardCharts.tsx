import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Clock,
  Calendar,
  Layers,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  ChevronRight,
  Info,
} from 'lucide-react';
import { TransportService, Allocation, Driver, ServiceType } from '../types';

interface DashboardChartsProps {
  services: TransportService[];
  allocations: Allocation[];
  drivers: Driver[];
}

const SERVICE_TYPE_CONFIG: Record<
  ServiceType,
  { label: string; shortLabel: string; color: string; bgLight: string; textClass: string }
> = {
  TRANSFER: {
    label: 'Transfers (Aeroporto / Hotel)',
    shortLabel: 'Transfers',
    color: '#2563eb', // Blue 600
    bgLight: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  TOUR_MEIO_DIA: {
    label: 'Tours de Meio-Dia (Half-Day)',
    shortLabel: 'Tours 1/2 Dia',
    color: '#059669', // Emerald 600
    bgLight: 'bg-emerald-50',
    textClass: 'text-emerald-700',
  },
  TOUR_DIA_INTEIRO: {
    label: 'Tours de Dia Inteiro (Full-Day)',
    shortLabel: 'Tours Dia Inteiro',
    color: '#7c3aed', // Violet 600
    bgLight: 'bg-purple-50',
    textClass: 'text-purple-700',
  },
  DISPOSICAO: {
    label: 'Serviços em Disposição / Eventos',
    shortLabel: 'Disposições',
    color: '#d97706', // Amber 600
    bgLight: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
};

const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

// Helper to compute duration in hours from start to end timestamps
function calculateDurationHours(startStr: string, endStr: string): number {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = end - start;
  if (isNaN(diffMs) || diffMs <= 0) return 0;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  services,
  allocations,
  drivers,
}) => {
  // Toggle for monthly view mode: 'TOTAL' or 'REGIME' (Salaried vs Freelancers)
  const [monthlyViewMode, setMonthlyViewMode] = useState<'TOTAL' | 'REGIME'>('TOTAL');
  const [selectedPieIndex, setSelectedPieIndex] = useState<number | null>(null);

  // 1. Process Data: Distribution by Service Type
  const serviceTypeDistribution = useMemo(() => {
    const counts: Record<ServiceType, { count: number; totalHours: number }> = {
      TRANSFER: { count: 0, totalHours: 0 },
      TOUR_MEIO_DIA: { count: 0, totalHours: 0 },
      TOUR_DIA_INTEIRO: { count: 0, totalHours: 0 },
      DISPOSICAO: { count: 0, totalHours: 0 },
    };

    services.forEach(service => {
      const alloc = allocations.find(a => a.serviceId === service.id);
      const start = alloc?.actualStart || service.scheduledStart;
      const end = alloc?.actualEnd || service.scheduledEnd;
      const hours = calculateDurationHours(start, end);

      if (counts[service.type]) {
        counts[service.type].count += 1;
        counts[service.type].totalHours += hours;
      }
    });

    const totalServices = services.length || 1;
    const totalHoursOverall = Object.values(counts).reduce((sum, item) => sum + item.totalHours, 0);

    return (Object.keys(counts) as ServiceType[]).map(type => {
      const item = counts[type];
      const percentage = Number(((item.count / totalServices) * 100).toFixed(1));
      const hoursPercentage = totalHoursOverall > 0
        ? Number(((item.totalHours / totalHoursOverall) * 100).toFixed(1))
        : 0;
      const avgDuration = item.count > 0 ? Number((item.totalHours / item.count).toFixed(1)) : 0;

      return {
        type,
        name: SERVICE_TYPE_CONFIG[type].shortLabel,
        fullName: SERVICE_TYPE_CONFIG[type].label,
        count: item.count,
        totalHours: Number(item.totalHours.toFixed(1)),
        percentage,
        hoursPercentage,
        avgDuration,
        color: SERVICE_TYPE_CONFIG[type].color,
      };
    });
  }, [services, allocations]);

  // 2. Process Data: Total Volume of Hours Worked per Month
  const monthlyHoursData = useMemo(() => {
    const monthlyMap: Record<
      string,
      {
        monthKey: string;
        monthLabel: string;
        totalHours: number;
        salariedHours: number;
        freelancerHours: number;
        unassignedHours: number;
        serviceCount: number;
      }
    > = {};

    services.forEach(service => {
      const datePart = service.scheduledStart.split('T')[0];
      const [year, month] = datePart.split('-');
      if (!year || !month) return;

      const monthKey = `${year}-${month}`;
      const monthName = MONTH_NAMES_PT[month] || month;
      const monthLabel = `${monthName} ${year.slice(2)}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          monthLabel,
          totalHours: 0,
          salariedHours: 0,
          freelancerHours: 0,
          unassignedHours: 0,
          serviceCount: 0,
        };
      }

      const alloc = allocations.find(a => a.serviceId === service.id);
      const start = alloc?.actualStart || service.scheduledStart;
      const end = alloc?.actualEnd || service.scheduledEnd;
      const hours = calculateDurationHours(start, end);

      monthlyMap[monthKey].serviceCount += 1;
      monthlyMap[monthKey].totalHours += hours;

      if (alloc && alloc.driverId) {
        const driver = drivers.find(d => d.id === alloc.driverId);
        if (driver?.regime === 'ASSALARIADO') {
          monthlyMap[monthKey].salariedHours += hours;
        } else if (driver?.regime === 'FREELANCER') {
          monthlyMap[monthKey].freelancerHours += hours;
        } else {
          monthlyMap[monthKey].salariedHours += hours;
        }
      } else {
        monthlyMap[monthKey].unassignedHours += hours;
      }
    });

    // Sort chronologically
    const sorted = Object.values(monthlyMap).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    return sorted.map(item => ({
      ...item,
      totalHours: Number(item.totalHours.toFixed(1)),
      salariedHours: Number(item.salariedHours.toFixed(1)),
      freelancerHours: Number(item.freelancerHours.toFixed(1)),
      unassignedHours: Number(item.unassignedHours.toFixed(1)),
    }));
  }, [services, allocations, drivers]);

  // Aggregate KPIs for the Monthly Hours Analysis
  const monthlyMetrics = useMemo(() => {
    const totalAccumulatedHours = monthlyHoursData.reduce((acc, curr) => acc + curr.totalHours, 0);
    const totalSalariedHours = monthlyHoursData.reduce((acc, curr) => acc + curr.salariedHours, 0);
    const totalFreelancerHours = monthlyHoursData.reduce((acc, curr) => acc + curr.freelancerHours, 0);
    const avgMonthlyHours =
      monthlyHoursData.length > 0
        ? Number((totalAccumulatedHours / monthlyHoursData.length).toFixed(1))
        : 0;

    let peakMonth = { monthLabel: 'N/A', totalHours: 0 };
    monthlyHoursData.forEach(item => {
      if (item.totalHours > peakMonth.totalHours) {
        peakMonth = { monthLabel: item.monthLabel, totalHours: item.totalHours };
      }
    });

    const salariedShare =
      totalAccumulatedHours > 0
        ? Number(((totalSalariedHours / totalAccumulatedHours) * 100).toFixed(0))
        : 0;
    const freelancerShare =
      totalAccumulatedHours > 0
        ? Number(((totalFreelancerHours / totalAccumulatedHours) * 100).toFixed(0))
        : 0;

    return {
      totalAccumulatedHours: Number(totalAccumulatedHours.toFixed(1)),
      avgMonthlyHours,
      peakMonth,
      salariedShare,
      freelancerShare,
    };
  }, [monthlyHoursData]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Análise Operacional & Indicadores Visuais
            </h2>
            <p className="text-xs text-slate-500">
              Distribuição por tipologia de serviço e histórico mensal de horas trabalhadas
            </p>
          </div>
        </div>

        {/* Global KPI Pill */}
        <div className="flex items-center gap-2 text-xs bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="text-slate-500 font-medium">Total de Serviços Registados:</span>
          <span className="font-bold text-slate-900">{services.length}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium">Horas Acumuladas:</span>
          <span className="font-bold text-blue-700">{monthlyMetrics.totalAccumulatedHours}h</span>
        </div>
      </div>

      {/* Main Grid: 2 Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Distribuição de Serviços por Tipo (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Distribuição por Tipo de Serviço</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {services.length} Total
              </span>
            </div>

            {/* Donut Chart Container */}
            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
                            <div className="font-bold text-sm" style={{ color: data.color }}>
                              {data.fullName}
                            </div>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>Volume de Serviços:</span>
                              <strong className="text-white font-mono">
                                {data.count} ({data.percentage}%)
                              </strong>
                            </div>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>Horas Operacionais:</span>
                              <strong className="text-white font-mono">{data.totalHours}h</strong>
                            </div>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>Duração Média:</span>
                              <strong className="text-white font-mono">{data.avgDuration}h / serv</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={serviceTypeDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    onMouseEnter={(_, index) => setSelectedPieIndex(index)}
                    onMouseLeave={() => setSelectedPieIndex(null)}
                  >
                    {serviceTypeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={selectedPieIndex === index ? 3 : 1}
                        style={{
                          transform: selectedPieIndex === index ? 'scale(1.03)' : 'scale(1)',
                          transformOrigin: 'center center',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Stat Inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  {services.length}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Serviços
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Legend Cards */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            {serviceTypeDistribution.map(item => (
              <div
                key={item.type}
                className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 flex flex-col justify-between transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-slate-800 truncate" title={item.fullName}>
                    {item.name}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900 font-mono">
                    {item.count} <span className="text-[10px] font-normal text-slate-500">({item.percentage}%)</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {item.totalHours}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: Volume Total de Horas Trabalhadas por Mês (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            {/* Header with Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Volume de Horas Trabalhadas por Mês
                </h3>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('TOTAL')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    monthlyViewMode === 'TOTAL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Total Acumulado
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('REGIME')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    monthlyViewMode === 'REGIME'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por Regime (IHT vs FL)
                </button>
              </div>
            </div>

            {/* Bar/Composed Chart Container */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {monthlyViewMode === 'TOTAL' ? (
                  <ComposedChart
                    data={monthlyHoursData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="h"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
                              <div className="font-bold text-sm text-blue-300">{label}</div>
                              <div className="text-slate-300 flex justify-between gap-4">
                                <span>Horas Totais:</span>
                                <strong className="text-white font-mono">{data.totalHours}h</strong>
                              </div>
                              <div className="text-slate-300 flex justify-between gap-4">
                                <span>Serviços Realizados:</span>
                                <strong className="text-white font-mono">{data.serviceCount}</strong>
                              </div>
                              <div className="text-slate-300 flex justify-between gap-4">
                                <span>Assalariados (IHT):</span>
                                <strong className="text-emerald-400 font-mono">
                                  {data.salariedHours}h
                                </strong>
                              </div>
                              <div className="text-slate-300 flex justify-between gap-4">
                                <span>Free-lancers:</span>
                                <strong className="text-amber-400 font-mono">
                                  {data.freelancerHours}h
                                </strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="totalHours"
                      name="Horas Trabalhadas"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </ComposedChart>
                ) : (
                  /* Stacked Bar Mode by Driver Regime */
                  <BarChart
                    data={monthlyHoursData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="h"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
                              <div className="font-bold text-sm text-slate-200">{label}</div>
                              <div className="text-emerald-400 flex justify-between gap-4">
                                <span>Assalariados (IHT):</span>
                                <strong className="font-mono">{data.salariedHours}h</strong>
                              </div>
                              <div className="text-amber-400 flex justify-between gap-4">
                                <span>Free-lancers (Horas/Pacotes):</span>
                                <strong className="font-mono">{data.freelancerHours}h</strong>
                              </div>
                              {data.unassignedHours > 0 && (
                                <div className="text-slate-400 flex justify-between gap-4">
                                  <span>Por Atribuir:</span>
                                  <strong className="font-mono">{data.unassignedHours}h</strong>
                                </div>
                              )}
                              <div className="pt-1 mt-1 border-t border-slate-700 text-white font-bold flex justify-between gap-4">
                                <span>Total do Mês:</span>
                                <span className="font-mono">{data.totalHours}h</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={value => (
                        <span className="text-slate-700 font-medium">
                          {value === 'salariedHours'
                            ? 'Motoristas Assalariados (IHT)'
                            : value === 'freelancerHours'
                            ? 'Free-lancers Contratados'
                            : 'Escalas Pendentes'}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="salariedHours"
                      name="salariedHours"
                      stackId="a"
                      fill="#059669"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={42}
                    />
                    <Bar
                      dataKey="freelancerHours"
                      name="freelancerHours"
                      stackId="a"
                      fill="#d97706"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly KPI Summary Badges */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Horas Acumuladas</span>
              <span className="font-bold text-slate-900 text-sm font-mono">
                {monthlyMetrics.totalAccumulatedHours}h
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Média Mensal</span>
              <span className="font-bold text-slate-900 text-sm font-mono">
                {monthlyMetrics.avgMonthlyHours}h / mês
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Mês com Maior Volume</span>
              <span className="font-bold text-emerald-700 text-sm">
                {monthlyMetrics.peakMonth.monthLabel} ({monthlyMetrics.peakMonth.totalHours}h)
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Repartição por Regime</span>
              <span className="font-bold text-blue-700 text-xs">
                {monthlyMetrics.salariedShare}% IHT • {monthlyMetrics.freelancerShare}% FL
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

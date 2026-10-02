import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CalendarX,
  UserX,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Filter,
  EyeOff,
  Eye,
  Check,
  CalendarPlus,
  Flame,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { OperationalAlert, OperationalAlertsSummary, AlertType } from '../utils/alertEngine';
import { TransportService } from '../types';

interface DashboardAlertCenterProps {
  alertsSummary: OperationalAlertsSummary;
  onNavigate: (tab: 'dashboard' | 'services' | 'roster' | 'drivers-fleet' | 'freelancer-calc') => void;
  onQuickResolveService?: (service: TransportService) => void;
}

type AlertFilterCategory = 'ALL' | 'URGENT' | 'CONFLICTS' | 'UNASSIGNED' | 'CONFIG';

export const DashboardAlertCenter: React.FC<DashboardAlertCenterProps> = ({
  alertsSummary,
  onNavigate,
  onQuickResolveService,
}) => {
  const [filterCategory, setFilterCategory] = useState<AlertFilterCategory>('ALL');
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);

  const {
    alerts,
    criticalCount,
    unassignedCount,
    dayOffConflictCount,
    missingScaleCount,
  } = alertsSummary;

  const toggleDismiss = (alertId: string) => {
    setDismissedAlertIds(prev =>
      prev.includes(alertId) ? prev.filter(id => id !== alertId) : [...prev, alertId]
    );
  };

  // Counts of active (non-dismissed) alerts
  const activeAlerts = alerts.filter(a => !dismissedAlertIds.includes(a.id));
  const activeCriticalCount = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
  const activeDayOffConflicts = activeAlerts.filter(
    a => a.type === 'DAYOFF_SERVICE_CONFLICT' || a.type === 'CATEGORY_MISMATCH'
  );
  const activeOverlapConflicts = activeAlerts.filter(
    a => a.type === 'SERVICE_OVERLAP_CONFLICT'
  );
  const activeConflicts = activeAlerts.filter(
    a =>
      a.type === 'DAYOFF_SERVICE_CONFLICT' ||
      a.type === 'CATEGORY_MISMATCH' ||
      a.type === 'SERVICE_OVERLAP_CONFLICT'
  );
  const activeUnassigned = activeAlerts.filter(a => a.type === 'UNASSIGNED_SERVICE');
  const activeMissingScales = activeAlerts.filter(a => a.type === 'MISSING_SHIFT_SCALE');
  const urgentAlerts = activeAlerts.filter(
    a => a.isToday || a.isTomorrow || a.severity === 'CRITICAL'
  );
  const todayAlerts = activeAlerts.filter(a => a.isToday);

  // Filtered list based on user selection
  const filteredAlerts = alerts.filter(alert => {
    const matchesDismissed = showDismissed ? true : !dismissedAlertIds.includes(alert.id);
    if (!matchesDismissed) return false;

    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'URGENT') return alert.isToday || alert.isTomorrow || alert.severity === 'CRITICAL';
    if (filterCategory === 'CONFLICTS')
      return (
        alert.type === 'DAYOFF_SERVICE_CONFLICT' ||
        alert.type === 'CATEGORY_MISMATCH' ||
        alert.type === 'SERVICE_OVERLAP_CONFLICT'
      );
    if (filterCategory === 'UNASSIGNED') return alert.type === 'UNASSIGNED_SERVICE';
    if (filterCategory === 'CONFIG') return alert.type === 'MISSING_SHIFT_SCALE';
    return true;
  });

  // If no alerts exist at all
  if (alerts.length === 0) {
    return (
      <div id="dashboard-alert-center" className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-emerald-950">
                  Painel de Avisos: Escalas & Folgas 100% Conformadas
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                  Zero Conflitos
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 mt-0.5">
                Não existem serviços sem escala atribuída nem conflitos com folgas rotativas ou períodos de férias.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/70 hover:bg-emerald-200/80 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <span>Ver Programação de Serviços</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const hasUrgentIssues = activeCriticalCount > 0 || todayAlerts.length > 0;

  return (
    <div
      id="dashboard-alert-center"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
    >
      {/* 1. Header Banner Principal com Identificação Visual do Estado */}
      <div
        className={`px-5 py-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          hasUrgentIssues
            ? 'bg-gradient-to-r from-rose-50/90 via-amber-50/50 to-white border-rose-200'
            : activeAlerts.length > 0
            ? 'bg-gradient-to-r from-amber-50/70 via-slate-50/60 to-white border-slate-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform ${
              hasUrgentIssues
                ? 'bg-rose-600 text-white shadow-rose-200'
                : 'bg-amber-500 text-white shadow-amber-200'
            }`}
          >
            {hasUrgentIssues ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Painel de Avisos & Conflitos Operacionais
              </h2>

              {/* Status Badges */}
              {activeCriticalCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                  {activeCriticalCount} Conflito{activeCriticalCount > 1 ? 's' : ''} Crítico{activeCriticalCount > 1 ? 's' : ''}
                </span>
              ) : activeUnassigned.length > 0 ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {activeUnassigned.length} Lacuna{activeUnassigned.length > 1 ? 's' : ''} de Escala
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                  Avisos Informativos
                </span>
              )}

              {todayAlerts.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-2xs">
                  {todayAlerts.length} para HOJE (12/09)
                </span>
              )}

              <span className="text-xs font-medium text-slate-500">
                ({activeAlerts.length} {activeAlerts.length === 1 ? 'incidência ativa' : 'incidências ativas'})
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Deteção em tempo real de <strong>conflitos entre serviços e folgas rotativas/férias</strong> e{' '}
              <strong>lacunas de escalas urgentes</strong> (serviços sem motorista ou viatura atribuída).
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          {dismissedAlertIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Alternar visibilidade de alertas marcados como cientes"
            >
              {showDismissed ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showDismissed ? 'Ocultar Cientes' : `Ver Cientes (${dismissedAlertIds.length})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>{isExpanded ? 'Recolher Painel' : 'Expandir Painel de Avisos'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* 2. Mini-Painel de Indicadores Operacionais do Painel de Avisos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Bloco 1: Conflitos de Folga & Sobreposições */}
            <div
              onClick={() => setFilterCategory('CONFLICTS')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterCategory === 'CONFLICTS'
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/40 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-rose-200 hover:bg-rose-50/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                  <CalendarX className="w-3.5 h-3.5 text-rose-600" />
                  Conflitos & Sobreposições
                </span>
                <span className={`text-base font-black font-mono ${activeConflicts.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {activeConflicts.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                {activeConflicts.length > 0
                  ? `${activeDayOffConflicts.length} folgas/hab. + ${activeOverlapConflicts.length} sobreposições`
                  : 'Sem coincidências ativas de folgas ou sobreposições'}
              </p>
            </div>

            {/* Bloco 2: Lacunas de Escala Urgentes */}
            <div
              onClick={() => setFilterCategory('UNASSIGNED')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterCategory === 'UNASSIGNED'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-amber-200 hover:bg-amber-50/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <UserX className="w-3.5 h-3.5 text-amber-600" />
                  Lacunas de Escala
                </span>
                <span className={`text-base font-black font-mono ${activeUnassigned.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {activeUnassigned.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                {activeUnassigned.length > 0
                  ? 'Serviços pendentes sem motorista ou viatura'
                  : 'Todos os serviços com escala atribuída'}
              </p>
            </div>

            {/* Bloco 3: Configuração de Escala em Falta */}
            <div
              onClick={() => setFilterCategory('CONFIG')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterCategory === 'CONFIG'
                  ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/40 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-purple-200 hover:bg-purple-50/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1">
                  <CalendarPlus className="w-3.5 h-3.5 text-purple-600" />
                  Escalas em Falta
                </span>
                <span className={`text-base font-black font-mono ${activeMissingScales.length > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                  {activeMissingScales.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                {activeMissingScales.length > 0
                  ? 'Assalariados sem escala de rotação definida'
                  : 'Todos os assalariados configurados'}
              </p>
            </div>

            {/* Bloco 4: Ação Prioritária (Hoje & Amanhã) */}
            <div
              onClick={() => setFilterCategory('URGENT')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                filterCategory === 'URGENT'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/40 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-blue-200 hover:bg-blue-50/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-blue-600" />
                  Urgentes (Hoje/Amanhã)
                </span>
                <span className={`text-base font-black font-mono ${urgentAlerts.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                  {urgentAlerts.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                {urgentAlerts.length > 0
                  ? `${todayAlerts.length} para hoje e ${urgentAlerts.length - todayAlerts.length} para amanhã`
                  : 'Sem pendências urgentes nas próximas 48h'}
              </p>
            </div>
          </div>

          {/* 3. Destaque Visual para Conflitos / Lacunas de Escalas Urgentes (Hoje & Amanhã) */}
          {urgentAlerts.length > 0 && filterCategory === 'ALL' && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 via-amber-50/60 to-white border border-rose-200 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                  <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                    Ação Operacional Imediata Requerida ({urgentAlerts.length} {urgentAlerts.length === 1 ? 'incidência urgente' : 'incidências urgentes'})
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-rose-800 bg-rose-100/90 px-2.5 py-0.5 rounded-full border border-rose-300">
                  Prioridade Máxima
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {urgentAlerts.slice(0, 2).map(urgent => (
                  <div
                    key={`urgent-hero-${urgent.id}`}
                    className="p-3.5 rounded-lg bg-white border border-rose-200 shadow-2xs flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white uppercase tracking-wider">
                          {urgent.isToday ? 'Urgência Máxima: HOJE (12/09)' : 'Urgência: AMANHÃ (13/09)'}
                        </span>
                        {urgent.serviceCode && (
                          <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {urgent.serviceCode}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">
                        {urgent.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                        {urgent.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {urgent.date}
                      </span>

                      {urgent.suggestedAction.serviceToAllocate && onQuickResolveService ? (
                        <button
                          type="button"
                          onClick={() => onQuickResolveService(urgent.suggestedAction.serviceToAllocate!)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                        >
                          <span>{urgent.suggestedAction.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate(urgent.suggestedAction.tabTarget)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                        >
                          <span>{urgent.suggestedAction.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Barra de Filtros e Opções de Visualização */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtrar:
              </span>

              <button
                type="button"
                onClick={() => setFilterCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({alerts.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterCategory('URGENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterCategory === 'URGENT'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Urgentes ({urgentAlerts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterCategory('CONFLICTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterCategory === 'CONFLICTS'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <CalendarX className="w-3.5 h-3.5" />
                <span>Conflitos & Sobreposições ({activeConflicts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterCategory('UNASSIGNED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterCategory === 'UNASSIGNED'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Lacunas de Escala ({activeUnassigned.length})</span>
              </button>

              {missingScaleCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterCategory('CONFIG')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filterCategory === 'CONFIG'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Escalas em Falta ({activeMissingScales.length})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium self-end sm:self-auto flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Referência: 12 de Setembro de 2026</span>
            </div>
          </div>

          {/* 5. Lista Estruturada de Avisos com Destaque Visual */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">Nenhum aviso correspondente ao filtro selecionado.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Todas as ocorrências desta categoria estão resolvidas ou em conformidade.</p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isDismissed = dismissedAlertIds.includes(alert.id);
                const isDayOffConflict = alert.type === 'DAYOFF_SERVICE_CONFLICT';
                const isOverlapConflict = alert.type === 'SERVICE_OVERLAP_CONFLICT';
                const isUnassigned = alert.type === 'UNASSIGNED_SERVICE';
                const isMissingScale = alert.type === 'MISSING_SHIFT_SCALE';
                const isCategoryMismatch = alert.type === 'CATEGORY_MISMATCH';

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isDismissed
                        ? 'opacity-60 bg-slate-50 border-slate-200'
                        : isDayOffConflict || isOverlapConflict
                        ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300 shadow-2xs'
                        : isCategoryMismatch
                        ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300 shadow-2xs'
                        : isUnassigned
                        ? alert.isToday
                          ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400 shadow-2xs ring-1 ring-amber-300/40'
                          : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                        : 'bg-purple-50/50 border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Badges, Title & Detailed Message */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Alert Type Badge */}
                          {isDayOffConflict && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-600 text-white shadow-2xs">
                              <CalendarX className="w-3 h-3" />
                              CONFLITO DE FOLGA ROTATIVA
                            </span>
                          )}

                          {isOverlapConflict && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-700 text-white shadow-2xs">
                              <ShieldAlert className="w-3 h-3" />
                              SOBREPOSIÇÃO NÃO PERMITIDA
                            </span>
                          )}

                          {isCategoryMismatch && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-700 text-white shadow-2xs">
                              <AlertCircle className="w-3 h-3" />
                              INCOMPATIBILIDADE DE HABILITAÇÃO (CAM)
                            </span>
                          )}

                          {isUnassigned && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                                alert.isToday
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              <UserX className="w-3 h-3" />
                              LACUNA DE ESCALA PENDENTE
                            </span>
                          )}

                          {isMissingScale && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-700 text-white shadow-2xs">
                              <CalendarPlus className="w-3 h-3" />
                              ESCALA DE ROTAÇÃO EM FALTA
                            </span>
                          )}

                          {/* Urgency Timing Badges */}
                          {alert.isToday && (
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              HOJE (12/09)
                            </span>
                          )}

                          {alert.isTomorrow && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                              AMANHÃ (13/09)
                            </span>
                          )}

                          {alert.serviceCode && (
                            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300">
                              {alert.serviceCode}
                            </span>
                          )}

                          {alert.dayOffLabel && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                              {alert.dayOffLabel}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>{alert.title}</span>
                        </h4>

                        {/* Description */}
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {alert.description}
                        </p>

                        {/* Extra Context Badges if available */}
                        {alert.driverName && (
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                            <span>Motorista afetado: <strong className="text-slate-700 font-semibold">{alert.driverName}</strong></span>
                            {alert.vehiclePlate && (
                              <>
                                <span>•</span>
                                <span>Viatura: <strong className="text-slate-700 font-mono font-semibold">{alert.vehiclePlate}</strong></span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Direct Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                        {/* Dismiss toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleDismiss(alert.id)}
                          className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center ${
                            isDismissed
                              ? 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                              : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                          title={isDismissed ? 'Reativar aviso' : 'Marcar como ciente'}
                        >
                          <Check className={`w-4 h-4 ${isDismissed ? 'text-slate-800' : 'text-slate-400'}`} />
                        </button>

                        {/* Primary Quick Action Button */}
                        {alert.suggestedAction.serviceToAllocate && onQuickResolveService ? (
                          <button
                            type="button"
                            onClick={() => onQuickResolveService(alert.suggestedAction.serviceToAllocate!)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                              isDayOffConflict || isCategoryMismatch
                                ? 'bg-rose-600 hover:bg-rose-500 text-white hover:shadow-rose-200'
                                : alert.isToday
                                ? 'bg-amber-600 hover:bg-amber-500 text-white hover:shadow-amber-200'
                                : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-200'
                            }`}
                          >
                            <span>{alert.suggestedAction.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate(alert.suggestedAction.tabTarget)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                              isDayOffConflict || isCategoryMismatch
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                          >
                            <span>{alert.suggestedAction.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Secondary Quick Jump: if conflict with day off, allow direct jump to Roster */}
                        {isDayOffConflict && (
                          <button
                            type="button"
                            onClick={() => onNavigate('roster')}
                            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 text-xs font-semibold transition-colors shadow-2xs"
                            title="Ver mapa de escalas e rotações de folga"
                          >
                            Ver Escala
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

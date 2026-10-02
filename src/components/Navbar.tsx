import React from 'react';
import {
  CalendarDays,
  Truck,
  Users,
  Calculator,
  LayoutDashboard,
  Database,
  FileCheck2,
  HardDrive,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Save,
  LogOut,
  UserCog,
  CloudOff,
  Clock,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'services'
  | 'shifts'
  | 'roster'
  | 'freelancer-calc'
  | 'drivers-fleet'
  | 'architecture';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingServicesCount: number;
  /** Inícios de jornada de hoje ainda por preencher */
  pendingShiftStartsCount?: number;
  alertsCount?: number;
  criticalAlertsCount?: number;
  onOpenBackupModal: () => void;
  autoSaveInfo?: {
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    lastSavedTime: string | null;
    onSaveNow?: () => void;
  };
  /** Presente quando a app usa a base de dados partilhada da equipa. */
  sharedSession?: {
    email: string;
    onSignOut: () => void;
    onOpenTeam: () => void;
    syncError?: string | null;
    isLive?: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingServicesCount,
  pendingShiftStartsCount = 0,
  alertsCount = 0,
  criticalAlertsCount = 0,
  onOpenBackupModal,
  autoSaveInfo,
  sharedSession,
}) => {
  const isShared = !!sharedSession;
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Visão Geral',
      icon: LayoutDashboard,
      badge: alertsCount > 0 ? alertsCount : undefined,
      badgeColor: criticalAlertsCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white',
    },
    {
      id: 'services' as ActiveTab,
      label: 'Serviços & Alocações',
      icon: Truck,
      badge: pendingServicesCount > 0 ? pendingServicesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'shifts' as ActiveTab,
      label: 'Jornadas',
      icon: Clock,
      badge: pendingShiftStartsCount > 0 ? pendingShiftStartsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'roster' as ActiveTab,
      label: 'Mapa de Folgas (Assalariados)',
      icon: CalendarDays,
    },
    {
      id: 'freelancer-calc' as ActiveTab,
      label: 'Apuramento Free-lancers',
      icon: Calculator,
    },
    {
      id: 'drivers-fleet' as ActiveTab,
      label: 'Motoristas & Frota',
      icon: Users,
    },
    {
      id: 'architecture' as ActiveTab,
      label: 'Modelo ER & Regras',
      icon: Database,
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-lg tracking-tight">
              TT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg leading-tight">
                  Transfers & Tours Ops
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  Escalas & Regimes
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestão de folgas rotativas, serviços e apuramento de motoristas
              </p>
            </div>
          </div>

          {/* Quick status pill, Alerts pill and Backup Action */}
          <div className="flex items-center gap-2.5 text-xs">
            {alertsCount > 0 && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs shadow-2xs transition-all border ${
                  criticalAlertsCount > 0
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                }`}
                title="Ver alertas operacionais de escalas e folgas no Dashboard"
              >
                {criticalAlertsCount > 0 ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span>
                  {alertsCount} {alertsCount === 1 ? 'Alerta' : 'Alertas'}
                </span>
                {criticalAlertsCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                )}
              </button>
            )}

            <button
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all border border-slate-700 hover:border-slate-600"
              title="Cópia de Segurança em JSON ou CSV para todo o sistema"
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Cópia de Segurança</span>
              <span className="hidden sm:inline-block text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                JSON/CSV
              </span>
            </button>

            {/* Auto-Save Indicator */}
            {sharedSession?.syncError ? (
              <button
                type="button"
                onClick={autoSaveInfo?.onSaveNow}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-300 font-semibold"
                title={sharedSession.syncError}
              >
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Erro ao gravar • tentar de novo</span>
              </button>
            ) : autoSaveInfo ? (
              <div className="flex items-center gap-2">
                {autoSaveInfo.isSaving ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                    <span className="hidden sm:inline">A guardar...</span>
                  </div>
                ) : autoSaveInfo.hasUnsavedChanges ? (
                  <button
                    type="button"
                    onClick={autoSaveInfo.onSaveNow}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-300 font-medium transition-colors cursor-pointer"
                    title={isShared ? 'A enviar alterações para a base de dados da equipa.' : 'Existem alterações pendentes. O auto-save grava automaticamente a cada 30s ou clique para salvar agora imediatamente.'}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
                    <span className="hidden md:inline">{isShared ? 'Por sincronizar' : 'Auto-save pendente (30s)'}</span>
                    <span className="text-[10px] font-bold bg-amber-200/80 px-1 py-0.2 rounded text-amber-900 flex items-center gap-1">
                      <Save className="w-2.5 h-2.5" />
                      Salvar Já
                    </span>
                  </button>
                ) : (
                  <div
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium"
                    title={isShared ? 'Todas as alterações estão gravadas na base de dados partilhada e chegam à equipa em tempo real.' : 'Auto-save periódico ativo (a cada 30 segundos). Todas as alterações de motoristas, veículos e serviços são salvas automaticamente em produção.'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{isShared ? (sharedSession?.isLive ? 'Sincronizado • tempo real' : 'Sincronizado') : 'Auto-Save Ativo (30s)'}</span>
                    {autoSaveInfo.lastSavedTime && (
                      <span className="text-[10px] text-emerald-600/80 font-normal">
                        • {autoSaveInfo.lastSavedTime}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Sistema Operacional Ativo
              </div>
            )}

            {sharedSession && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={sharedSession.onOpenTeam}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold"
                  title={`Sessão: ${sharedSession.email} • Gerir quem tem acesso`}
                >
                  <UserCog className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="hidden xl:inline max-w-[160px] truncate">{sharedSession.email}</span>
                  <span className="xl:hidden">Equipa</span>
                </button>
                <button
                  type="button"
                  onClick={sharedSession.onSignOut}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1 -mb-px">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors rounded-t-md ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold ${
                      item.badgeColor || 'bg-amber-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

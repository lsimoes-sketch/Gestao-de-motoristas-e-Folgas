import React, { useState } from 'react';
import {
  Calculator,
  Clock,
  Utensils,
  Euro,
  FileCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  History,
  Sliders,
  Edit3,
  Bot,
} from 'lucide-react';
import { ContractedPackage, FreelancerSettlement } from '../types';
import { calculateFreelancerService, DEFAULT_PRICING } from '../utils/rulesEngine';

interface FreelancerCalcViewProps {
  settlements: FreelancerSettlement[];
}

export const FreelancerCalcView: React.FC<FreelancerCalcViewProps> = ({ settlements }) => {
  // Simulator inputs
  const [startDate, setStartDate] = useState('2026-09-12');
  const [startTime, setStartTime] = useState('18:00');
  const [endDate, setEndDate] = useState('2026-09-12');
  const [endTime, setEndTime] = useState('22:00');
  const [contractedPackage, setContractedPackage] = useState<ContractedPackage>('AUTO_MELHOR_TARIFA');

  // Manual Meal Override state
  const [isManualMeal, setIsManualMeal] = useState(false);
  const [manualMealGranted, setManualMealGranted] = useState(true);
  const [manualMealReason, setManualMealReason] = useState('Autorizado pela operação / Serviço cobriu período de jantar');

  // Pricing config state
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [showPricingConfig, setShowPricingConfig] = useState(false);

  // Compute live calculation
  const startFull = `${startDate}T${startTime}`;
  const endFull = `${endDate}T${endTime}`;
  const result = calculateFreelancerService(
    startFull,
    endFull,
    contractedPackage,
    pricing,
    {
      isManual: isManualMeal,
      mealGranted: manualMealGranted,
      manualReason: manualMealReason,
    }
  );

  // Quick Preset Scenarios including the client's exact clarification
  const loadScenario = (scenario: number) => {
    if (scenario === 1) {
      // Exemplo do Cliente: 5h30 de Serviço -> Pacote 4h + 2h Extra (Regra de transição às 6h)
      setStartDate('2026-09-12');
      setStartTime('08:30');
      setEndDate('2026-09-12');
      setEndTime('14:00'); // 5h30m
      setContractedPackage('AUTO_MELHOR_TARIFA');
      setIsManualMeal(false);
    } else if (scenario === 2) {
      // Exemplo do Cliente: 6h30 de Serviço -> Transição para Pacote de 8h
      setStartDate('2026-09-12');
      setStartTime('08:00');
      setEndDate('2026-09-12');
      setEndTime('14:30'); // 6h30m -> Ultrapassa 6h -> Transita p/ Pacote 8h
      setContractedPackage('AUTO_MELHOR_TARIFA');
      setIsManualMeal(false);
    } else if (scenario === 3) {
      // Exemplo do Cliente: 19h30 às 20h15 (45 min) -> NÃO confere refeição
      setStartDate('2026-09-12');
      setStartTime('19:30');
      setEndDate('2026-09-12');
      setEndTime('20:15');
      setContractedPackage('AUTO_MELHOR_TARIFA');
      setIsManualMeal(false);
    } else if (scenario === 4) {
      // Exemplo do Cliente: 18h00 às 22h00 (4h) -> CONFERE refeição (+15€)
      setStartDate('2026-09-12');
      setStartTime('18:00');
      setEndDate('2026-09-12');
      setEndTime('22:00');
      setContractedPackage('AUTO_MELHOR_TARIFA');
      setIsManualMeal(false);
    } else if (scenario === 5) {
      // Tour com atraso até às 20h45 -> 1x 8h + 4h extra + REFEIÇÃO SIM
      setStartDate('2026-09-12');
      setStartTime('09:00');
      setEndDate('2026-09-12');
      setEndTime('20:45');
      setContractedPackage('PACOTE_8H');
      setIsManualMeal(false);
    } else if (scenario === 6) {
      // Inserção Manual pelo Operador
      setStartDate('2026-09-12');
      setStartTime('17:00');
      setEndDate('2026-09-12');
      setEndTime('20:30');
      setContractedPackage('AUTO_MELHOR_TARIFA');
      setIsManualMeal(true);
      setManualMealGranted(true);
      setManualMealReason('Aprovação direta pelo encarregado de frota');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4" />
            <span>Motor Determinístico de Faturação</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Simulador & Apuramento de Serviços Free-lancer
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Cálculo de pacotes (4h e 8h), apuramento de horas extra e gestão de refeição (&gt;20h)
            com opção de <strong>Sugestão Automática</strong> ou <strong>Inserção Manual pelo Operador</strong>.
          </p>
        </div>

        <button
          onClick={() => setShowPricingConfig(!showPricingConfig)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showPricingConfig ? 'Ocultar Tarifas' : 'Ajustar Tarifas'}</span>
        </button>
      </div>

      {/* Pricing Config Collapsible */}
      {showPricingConfig && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in fade-in duration-150">
          <div className="text-xs font-bold text-slate-700 mb-3">
            Tabela Tarifária Aplicada aos Cálculos:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Pacote 4h (€):</label>
              <input
                type="number"
                value={pricing.package4h}
                onChange={e => setPricing({ ...pricing, package4h: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 mt-1 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Pacote 8h (€):</label>
              <input
                type="number"
                value={pricing.package8h}
                onChange={e => setPricing({ ...pricing, package8h: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 mt-1 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Hora Extra (€/h):</label>
              <input
                type="number"
                value={pricing.overtimeHour}
                onChange={e => setPricing({ ...pricing, overtimeHour: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 mt-1 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Refeição &gt;20h (€):</label>
              <input
                type="number"
                value={pricing.mealAllowance}
                onChange={e => setPricing({ ...pricing, mealAllowance: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 mt-1 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preset Scenario Buttons matching User Clarifications */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-600 mr-1">Casos Reais do Cliente:</span>
        <button
          onClick={() => loadScenario(1)}
          className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-200 shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>5h30 &rarr; Pacote 4h + 2h Extra (110€)</span>
        </button>
        <button
          onClick={() => loadScenario(2)}
          className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg border border-indigo-200 shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span>6h30 (&gt;6h) &rarr; Transição Pacote 8h (130€)</span>
        </button>
        <button
          onClick={() => loadScenario(3)}
          className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>19h30 - 20h15 (45m) &rarr; Sem Refeição</span>
        </button>
        <button
          onClick={() => loadScenario(4)}
          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>18h00 - 22h00 (4h) &rarr; Com Refeição (+15€)</span>
        </button>
        <button
          onClick={() => loadScenario(5)}
          className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 shadow-2xs transition-colors"
        >
          Tour Atraso (09h - 20h45)
        </button>
        <button
          onClick={() => loadScenario(6)}
          className="px-3 py-1.5 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <Edit3 className="w-3 h-3 text-purple-600" />
          <span>Teste: Inserção Manual</span>
        </button>
      </div>

      {/* Main Grid: Controls vs Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Simulator Inputs */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-900">Parâmetros do Serviço Real</h2>
            <p className="text-xs text-slate-500">Defina o início, término e controlo da refeição.</p>
          </div>

          <div className="space-y-3">
            {/* Start Date & Time */}
            <div>
              <label className="text-xs font-bold text-slate-700">Início Efetivo:</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div>
              <label className="text-xs font-bold text-slate-700">Término Efetivo:</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contracted Mode */}
            <div>
              <label className="text-xs font-bold text-slate-700">Modalidade de Contratação:</label>
              <select
                value={contractedPackage}
                onChange={e => setContractedPackage(e.target.value as ContractedPackage)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="AUTO_MELHOR_TARIFA">
                  Automático: &le;4h Pacote 4h | &gt;4h Pacote 8h (+ horas extra)
                </option>
                <option value="PACOTE_4H">Contratado Meio-Dia (Pacote 4h + horas extra se exceder)</option>
                <option value="PACOTE_8H">Contratado Dia Inteiro (Pacote 8h + horas extra se exceder)</option>
              </select>
            </div>

            {/* Manual Meal Selection Section (As requested by user) */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Modo de Atribuição da Refeição:</span>
                </label>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsManualMeal(false)}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      !isManualMeal ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    <span>Automático</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualMeal(true)}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      isManualMeal ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Manual</span>
                  </button>
                </div>
              </div>

              {isManualMeal ? (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">
                      Atribuir Refeição (+15.00 €)?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setManualMealGranted(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          manualMealGranted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        SIM (+15€)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualMealGranted(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          !manualMealGranted
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        NÃO (0€)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-purple-800">
                      Observação / Justificação da Decisão Manual:
                    </label>
                    <input
                      type="text"
                      value={manualMealReason}
                      onChange={e => setManualMealReason(e.target.value)}
                      placeholder="Ex: Autorizado pela chefia / Cobriu horário de jantar"
                      className="w-full text-xs rounded-lg border border-purple-200 bg-white p-2 mt-1 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Regra do Sistema:</strong> Serviços curtos (ex: 19h30 - 20h15, 45m) não recebem refeição. Serviços com duração substantiva após as 20h (ex: 18h00 - 22h00, 4h) recebem automaticamente.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Garantia de Fecho Comercial:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              O free-lancer fatura no mínimo 1 Pacote de 4h para qualquer serviço. A decisão de refeição fica auditada e gravada no extrato de faturação.
            </p>
          </div>
        </div>

        {/* Right Col (7 cols): Calculated Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Desdobramento do Apuramento
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                  <span>Extrato do Serviço</span>
                  {result.mealMode === 'MANUAL' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
                      Refeição Manual
                    </span>
                  )}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Valor Total a Pagar:</span>
                <div className="text-2xl font-black text-emerald-600">{result.totalCost.toFixed(2)} €</div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">Duração Efetiva</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{result.durationHours} h</div>
                <div className="text-[10px] text-slate-500">{result.durationMinutes} minutos</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">Pacote Aplicado</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {result.package4h > 0 ? '1x 4 Horas' : result.package8h > 0 ? '1x 8 Horas' : 'Nenhum'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {result.package4h > 0 ? `${pricing.package4h.toFixed(2)} €` : `${pricing.package8h.toFixed(2)} €`}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">Horas Extra</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{result.overtimeHours} h</div>
                <div className="text-[10px] text-slate-500">
                  + {result.overtimeCost.toFixed(2)} € ({pricing.overtimeHour}€/h)
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  result.mealGranted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="text-[11px] font-semibold flex items-center justify-between">
                  <span>Refeição</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-white/60">
                    {result.mealMode}
                  </span>
                </div>
                <div className="text-lg font-bold mt-0.5">
                  {result.mealGranted ? 'SIM' : 'NÃO'}
                </div>
                <div className="text-[10px]">
                  {result.mealGranted ? `+ ${pricing.mealAllowance.toFixed(2)} €` : 'Sem suplemento'}
                </div>
              </div>
            </div>

            {/* Meal Explanation Callout */}
            <div
              className={`p-3.5 rounded-xl border mt-4 text-xs flex items-start gap-2.5 ${
                result.mealGranted
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Utensils
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  result.mealGranted ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <div>
                <strong>Auditoria da Decisão de Refeição ({result.mealMode}):</strong> {result.mealReason}.
              </div>
            </div>

            {/* Detailed Formula Calculation */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
              <div className="font-bold text-slate-900 font-sans text-[11px] uppercase tracking-wider">
                Cálculo Detalhado da Faturação:
              </div>
              <div className="flex justify-between">
                <span>
                  • Pacote Base ({result.package4h > 0 ? '4h' : '8h'}):
                </span>
                <span>{result.baseCost.toFixed(2)} €</span>
              </div>
              {result.overtimeHours > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>
                    • Horas Extra ({result.overtimeHours}h &times; {pricing.overtimeHour}€):
                  </span>
                  <span>+ {result.overtimeCost.toFixed(2)} €</span>
                </div>
              )}
              {result.mealGranted && (
                <div className="flex justify-between text-emerald-800">
                  <span>• Suplemento Refeição ({result.mealMode}):</span>
                  <span>+ {pricing.mealAllowance.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900 text-sm">
                <span>TOTAL A PAGAR AO MOTORISTA:</span>
                <span className="text-emerald-700">{result.totalCost.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            Conforme especificado no modelo de dados, este apuramento é gravado de forma imutável na
            tabela <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">apuramentos_freelancer</code> para evitar alterações em revisões tarifárias futuras.
          </div>
        </div>
      </div>

      {/* Historic Persisted Settlements */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Histórico de Apuramentos Persistidos (Auditoria)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {settlements.length} apuramentos fechados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Motorista FL</th>
                <th className="py-3 px-4">Período Efetivo</th>
                <th className="py-3 px-4">Duração</th>
                <th className="py-3 px-4">Pacote</th>
                <th className="py-3 px-4">H. Extra</th>
                <th className="py-3 px-4">Refeição</th>
                <th className="py-3 px-4 text-right">Total Fechado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settlements.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.serviceCode}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{item.driverName}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">
                    {item.actualStart.split('T')[1]} - {item.actualEnd.split('T')[1]}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{item.durationHours}h</td>
                  <td className="py-3 px-4 font-medium">
                    {item.package4h > 0 ? 'Pacote 4h' : 'Pacote 8h'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-amber-700">
                    {item.overtimeHours > 0 ? `${item.overtimeHours}h` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.mealGranted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.mealGranted ? 'SIM (+15€)' : 'NÃO'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 font-mono text-sm">
                    {item.totalAmount.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

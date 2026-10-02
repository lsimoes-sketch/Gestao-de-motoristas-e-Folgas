import React, { useState } from 'react';
import {
  Database,
  Layers,
  Code2,
  FileCheck2,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyDdl = () => {
    const ddl = `-- ESQUEMA DE BASE DE DADOS (POSTGRESQL / SUPABASE)
CREATE TYPE regime_trabalho_enum AS ENUM ('ASSALARIADO', 'FREELANCER');
CREATE TYPE categoria_habilitada_enum AS ENUM ('LIGEIROS', 'MISTO_PESADOS');
CREATE TYPE categoria_veiculo_enum AS ENUM ('LIGEIROS', 'PESADOS_PASSAGEIROS');

CREATE TABLE motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_mecanografico VARCHAR(20) UNIQUE NOT NULL,
  nome_completo VARCHAR(120) NOT NULL,
  telemovel VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  regime_trabalho regime_trabalho_enum NOT NULL,
  possui_isencao_horario BOOLEAN NOT NULL DEFAULT true,
  categoria_veiculo_habilitada categoria_habilitada_enum NOT NULL,
  numero_carta_conducao VARCHAR(30) NOT NULL,
  data_validade_cam DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula VARCHAR(15) UNIQUE NOT NULL,
  marca_modelo VARCHAR(60) NOT NULL,
  categoria_veiculo categoria_veiculo_enum NOT NULL,
  lotacao_lugares SMALLINT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_servico VARCHAR(30) UNIQUE NOT NULL,
  tipo_servico VARCHAR(30) NOT NULL,
  categoria_veiculo_necessaria categoria_veiculo_enum NOT NULL,
  data_hora_inicio_prevista TIMESTAMPTZ NOT NULL,
  data_hora_fim_prevista TIMESTAMPTZ NOT NULL,
  local_origem VARCHAR(150) NOT NULL,
  local_destino VARCHAR(150) NOT NULL,
  estado VARCHAR(20) DEFAULT 'PENDENTE'
);

CREATE TABLE alocacoes_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE,
  motorista_id UUID REFERENCES motoristas(id),
  veiculo_id UUID REFERENCES veiculos(id),
  data_hora_inicio_real TIMESTAMPTZ,
  data_hora_fim_real TIMESTAMPTZ,
  tipo_pacote_contratado VARCHAR(30),
  estado_alocacao VARCHAR(20) DEFAULT 'ATRIBUIDO'
);

CREATE TABLE apuramentos_freelancer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alocacao_id UUID UNIQUE REFERENCES alocacoes_servico(id),
  motorista_id UUID REFERENCES motoristas(id),
  duracao_total_horas NUMERIC(5,2) NOT NULL,
  qtd_pacote_4h SMALLINT NOT NULL DEFAULT 0,
  qtd_pacote_8h SMALLINT NOT NULL DEFAULT 0,
  horas_extra NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  refeicao_modo VARCHAR(20) NOT NULL DEFAULT 'AUTO', -- 'AUTO' ou 'MANUAL'
  refeicao_atribuida BOOLEAN NOT NULL DEFAULT false,
  motivo_refeicao VARCHAR(150),
  valor_total_estimado NUMERIC(10,2),
  fechado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mapa_folgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID REFERENCES motoristas(id) ON DELETE CASCADE,
  data_folga DATE NOT NULL,
  tipo_dia VARCHAR(30) NOT NULL,
  origem VARCHAR(30) DEFAULT 'GERADA_AUTOMATICA',
  bloqueado_para_servico BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(motorista_id, data_folga)
);`;
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Especificação Técnica & Modelo ER</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Arquitetura de Dados & Regras de Negócio
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Documentação formal com entidades, relacionamentos, constraints de integridade e fórmulas
            determinísticas para programadores.
          </p>
        </div>

        <button
          onClick={copyDdl}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'DDL Copiado!' : 'Copiar DDL SQL'}</span>
        </button>
      </div>

      {/* Relational Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            1. Entidade Central
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-1">motoristas</h3>
          <p className="text-xs text-slate-600 mt-1">
            Dicotomia via ENUM <code className="bg-slate-100 px-1 py-0.5 rounded">regime_trabalho</code>{' '}
            (ASSALARIADO com IHT vs FREELANCER com apuramento) e{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">categoria_veiculo_habilitada</code> (LIGEIROS vs MISTO_PESADOS).
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">
            2. Escala & Folgas
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-1">mapa_folgas</h3>
          <p className="text-xs text-slate-600 mt-1">
            Projeção contínua de rotação (6x2 / 5x2) com chave única{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">(motorista_id, data_folga)</code>. Bloqueia alocação de serviços em dias de descanso.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            3. Fecho Financeiro
          </div>
          <h3 className="font-bold text-slate-900 text-sm mt-1">apuramentos_freelancer</h3>
          <p className="text-xs text-slate-600 mt-1">
            Registo persistido e imutável de pacotes de 4h, 8h, horas extra e refeição (&gt;20h),
            garantindo auditoria e integridade histórica de pagamentos.
          </p>
        </div>
      </div>

      {/* Structured Specification Sections */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Constraints */}
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Regras de Integridade e Validações Estruturais</span>
          </h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
              <div>
                <strong>Restrição de Habilitação de Veículo:</strong> Se o serviço exigir{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-purple-700">
                  PESADOS_PASSAGEIROS
                </code>
                , o motorista associado tem obrigatoriamente de ter{' '}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-purple-700">
                  MISTO_PESADOS
                </code>{' '}
                e CAM com data de validade ativa. Motoristas apenas com "Ligeiros" são terminantemente
                bloqueados pelo motor de validação.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
              <div>
                <strong>Não-sobreposição de Serviços (com Exceção de Aeroporto):</strong> Como regra geral,
                o motorista não pode estar alocado a dois serviços simultâneos cujos intervalos de tempo coincidam.
                <strong> Exceção Regulamentar:</strong> o motorista pode estar alocado a dois serviços em simultâneo
                desde que os serviços sejam uma <em>Chegada</em> e uma <em>Saída</em> de e para o Aeroporto.
                Neste caso excecional, a sobreposição é aceite desde que o horário do transfer de saída não
                ultrapasse os <strong>30 minutos</strong> para lá do horário do transfer de chegada.
                <div className="mt-1.5 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 font-sans space-y-1">
                  <div className="font-semibold text-slate-800">Exemplos Práticos de Validação:</div>
                  <div>• <strong>Aceite:</strong> Motorista A com Chegada às 09:00 e Saída às 09:05 (+5 min &le; 30 min) &rarr; <span className="text-emerald-700 font-bold">Aceitar sobreposição</span>.</div>
                  <div>• <strong>Aceite:</strong> Motorista A com Chegada às 09:00 e Saída às 09:30 (+30 min &le; 30 min) &rarr; <span className="text-emerald-700 font-bold">Aceitar sobreposição</span>.</div>
                  <div>• <strong>Não Aceite:</strong> Motorista A com Chegada às 09:00 e Saída às 09:35 (+35 min &gt; 30 min) &rarr; <span className="text-rose-700 font-bold">Recusar sobreposição (violação estrutural)</span>.</div>
                  <div>• <strong>Não Aceite:</strong> Dois serviços que não sejam Chegada + Saída de Aeroporto (ex: duas chegadas, dois tours ou transfers citadinos) &rarr; <span className="text-rose-700 font-bold">Recusar sobreposição</span>.</div>
                </div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
              <div>
                <strong>Isenção de Horário dos Assalariados:</strong> O registo de horas de assalariados
                serve apenas para conformidade de tempos de repouso (11h consecutivas), não gerando
                cálculos de pacotes nem horas suplementares como nos free-lancers.
              </div>
            </li>
          </ul>
        </div>

        {/* Free-lancer Formulas */}
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>Fórmulas Determinísticas de Cálculo para Free-lancers</span>
          </h2>
          <div className="mt-3 bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-2">
            <div className="text-slate-400">// 1. Duração total em horas decimais</div>
            <div>duracao_horas = (fim_real - inicio_real) / 3600000;</div>
            <div className="text-slate-400 mt-2">// 2. Enquadramento de Pacotes e Transição às 6h (Confirmada pelo Cliente):</div>
            <div>IF duracao_horas &le; 4.0 THEN pacote_4h = 1; pacote_8h = 0; horas_extra = 0;</div>
            <div>ELSE IF duracao_horas &le; 6.0 THEN pacote_4h = 1; pacote_8h = 0; horas_extra = CEIL(duracao_horas - 4.0); // Ex: 5h30 &rarr; 4h + 2h extra</div>
            <div>ELSE IF duracao_horas &le; 8.0 THEN pacote_4h = 0; pacote_8h = 1; horas_extra = 0; // Ultrapassa 6h &rarr; Transita para Pacote 8h</div>
            <div>ELSE pacote_4h = 0; pacote_8h = 1; horas_extra = CEIL(duracao_horas - 8.0);</div>
            <div className="text-slate-400 mt-2">// 3. Regra de Refeição das 20h (Confirmada pelo Cliente + Inserção Manual):</div>
            <div>IF modo_refeicao == 'MANUAL' THEN refeicao_atribuida = escolha_operador;</div>
            <div>ELSE IF termina_apos_20h AND duracao_horas &ge; 2.5 THEN refeicao_atribuida = true; // Ex: 18h00-22h00 confere (+15€)</div>
            <div>ELSE IF termina_apos_20h AND duracao_horas &lt; 2.5 THEN refeicao_atribuida = false; // Ex: 19h30-20h15 não confere</div>
            <div>ELSE refeicao_atribuida = false;</div>
          </div>
        </div>

        {/* Questions for the client */}
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Matriz de Validação das Regras de Negócio</span>
          </h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-950">1. Refeição das 20h:</strong>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  CONFIRMADO & IMPLEMENTADO
                </span>
              </div>
              <p className="text-emerald-900">
                <strong>Regra validada:</strong> Serviços pontuais curtos (ex.: 19h30 às 20h15, 45 min)
                <strong> NÃO conferem refeição</strong>. Serviços de amplitude que cobrem o horário de jantar
                (ex.: 18h00 às 22h00, 4h) <strong>conferem refeição</strong>. O sistema disponibiliza
                <strong> Inserção Manual pelo Operador</strong> em todos os pontos de fecho de serviço.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-950">2. Transição 4h para 8h:</strong>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  CONFIRMADO & IMPLEMENTADO
                </span>
              </div>
              <p className="text-emerald-900">
                <strong>Regra validada:</strong> Quando um serviço de 4h atinge 5h30, fatura-se
                <strong> Pacote 4h + 2h extra</strong> (arredondamento por excesso). Quando o serviço
                <strong> ultrapassa as 6 horas</strong>, efetua-se a transição direta para o
                <strong> Pacote das 8 horas</strong>.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-950">3. Ciclos de Folga dos Assalariados:</strong>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  CONFIRMADO & IMPLEMENTADO
                </span>
              </div>
              <p className="text-emerald-900">
                <strong>Regra validada:</strong> O modelo padrão em vigor é a
                <strong> rotação mensal personalizada com fins-de-semana alternados</strong>.
                Os motoristas descansam ao sábado e domingo a cada 2 semanas (semanas ímpares/pares); nas
                semanas em que prestam serviço ao fim de semana, gozam 2 dias úteis consecutivos de descanso
                compensatório (ex: Terça/Quarta).
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-950">4. Arredondamento de Horas Extra:</strong>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  CONFIRMADO & IMPLEMENTADO
                </span>
              </div>
              <p className="text-emerald-900">
                <strong>Regra validada:</strong> As frações de hora excedentes são arredondadas por excesso
                à hora seguinte (ex: 5h30 total = 1h30 além de 4h &rarr; 2h extra faturadas a 20€/h).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

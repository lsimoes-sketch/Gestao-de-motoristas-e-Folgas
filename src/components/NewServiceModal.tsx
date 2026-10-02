import React, { useState } from 'react';
import { TransportService, ServiceType, VehicleCategory, AirportTransferDirection } from '../types';
import { getTodayStr } from '../utils/dates';

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (service: TransportService) => void;
}

export const NewServiceModal: React.FC<NewServiceModalProps> = ({
  isOpen,
  onClose,
  onAddService,
}) => {
  const [code, setCode] = useState(`SRV-${Date.now().toString().slice(-4)}`);
  const [type, setType] = useState<ServiceType>('TRANSFER');
  const [category, setCategory] = useState<VehicleCategory>('LIGEIROS');
  const [transferDirection, setTransferDirection] = useState<AirportTransferDirection | undefined>(undefined);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(() => getTodayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [passengers, setPassengers] = useState(4);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !clientName) return;

    const newService: TransportService = {
      id: `s-${Date.now()}`,
      code,
      type,
      requiredCategory: category,
      transferDirection,
      origin,
      destination,
      scheduledStart: `${date}T${startTime}`,
      scheduledEnd: `${date}T${endTime}`,
      status: 'PENDENTE',
      passengers,
      clientName,
      notes,
    };

    onAddService(newService);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">Criar Novo Serviço de Transporte</h2>
          <p className="text-xs text-slate-500">
            Registe um transfer, tour ou serviço com exigência de categoria de veículo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700">Código do Serviço:</label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Tipo de Serviço:</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ServiceType)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 bg-white"
            >
              <option value="TRANSFER">Transfer</option>
              <option value="TOUR_MEIO_DIA">Tour Meio Dia</option>
              <option value="TOUR_DIA_INTEIRO">Tour Dia Inteiro</option>
              <option value="DISPOSICAO">Serviço à Disposição</option>
            </select>
          </div>
        </div>

        {type === 'TRANSFER' && (
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 text-xs space-y-1">
            <label className="font-bold text-sky-950 flex items-center justify-between">
              <span>Orientação de Transfer de Aeroporto (Opcional):</span>
              <span className="text-[10px] text-sky-700 font-normal">
                Regra de não-sobreposição &le; 30m
              </span>
            </label>
            <select
              value={transferDirection || ''}
              onChange={e =>
                setTransferDirection((e.target.value as AirportTransferDirection) || undefined)
              }
              className="w-full text-xs rounded-lg border border-sky-300 p-2 bg-white text-slate-800"
            >
              <option value="">Detetar Automaticamente (via Origem / Destino / Notas)</option>
              <option value="CHEGADA">Chegada de Voo (de Aeroporto para Hotel/Destino)</option>
              <option value="SAIDA">Saída para Voo (do Hotel/Origem para o Aeroporto)</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700">Categoria Exigida:</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as VehicleCategory)}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 mt-1 bg-white text-slate-900"
            >
              <option value="LIGEIROS">Ligeiros (até 9 pax)</option>
              <option value="PESADOS_PASSAGEIROS">Pesados de Passageiros (Autocarro/Minibus)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Nº de Passageiros:</label>
            <input
              type="number"
              min={1}
              max={70}
              required
              value={passengers}
              onChange={e => setPassengers(parseInt(e.target.value) || 1)}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700">Data:</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Hora Início:</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Hora Término:</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">Cliente / Agência:</label>
          <input
            type="text"
            required
            placeholder="Ex: Agência Douro Tours / Grupo Silva"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700">Local de Origem (Pick-up):</label>
            <input
              type="text"
              required
              placeholder="Ex: Aeroporto de Lisboa"
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Local de Destino (Drop-off):</label>
            <input
              type="text"
              required
              placeholder="Ex: Hotel Altis Grand"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">Notas / Requisitos:</label>
          <textarea
            rows={2}
            placeholder="Ex: Voo, guia em inglês, necessidade de microfone..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            Guardar Serviço
          </button>
        </div>
      </form>
    </div>
  );
};

'use client';

import { BatchConfig, StatusType } from './index';

interface Props {
  config: BatchConfig;
  setConfig: React.Dispatch<React.SetStateAction<BatchConfig>>;
  preview: string[];
  loading: boolean;
}

const inputStyle =
  'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 disabled:opacity-60';

export default function ModoBatch({ config, setConfig, preview, loading }: Props) {
  const set = (field: keyof BatchConfig, value: any) =>
    setConfig((prev) => ({ ...prev, [field]: value ?? '' }));

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Dica:</strong> Crie múltiplas unidades com numeração sequencial automaticamente.
        Máximo de 100 unidades por operação.
      </div>

      <input
        placeholder="Bloco (opcional)"
        value={config.bloco}
        disabled={loading}
        onChange={(e) => set('bloco', e.target.value)}
        className={inputStyle}
      />

      <select
        value={config.tipo}
        disabled={loading}
        onChange={(e) => set('tipo', e.target.value)}
        className={inputStyle}
      >
        <option value="T0">T0</option>
        <option value="T1">T1</option>
        <option value="T2">T2</option>
        <option value="T3">T3</option>
        <option value="T4">T4</option>
        <option value="Vivenda">Vivenda</option>
        <option value="Loja">Loja</option>
        <option value="Garagem">Garagem</option>
        <option value="Arrecadação">Arrecadação</option>
      </select>

      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Prefixo (ex: A)"
          value={config.prefixo}
          disabled={loading}
          onChange={(e) => set('prefixo', e.target.value)}
          className={inputStyle}
        />
        <input
          placeholder="Sufixo (opcional)"
          value={config.sufixo}
          disabled={loading}
          onChange={(e) => set('sufixo', e.target.value)}
          className={inputStyle}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Número inicial"
          value={config.numeroInicial}
          disabled={loading}
          onChange={(e) => set('numeroInicial', e.target.value)}
          className={inputStyle}
        />
        <input
          type="number"
          placeholder="Número final"
          value={config.numeroFinal}
          disabled={loading}
          onChange={(e) => set('numeroFinal', e.target.value)}
          className={inputStyle}
        />
      </div>

      <input
        type="number"
        placeholder="Área (m²) — opcional"
        value={config.area}
        disabled={loading}
        onChange={(e) => set('area', e.target.value)}
        className={inputStyle}
      />

      <input
        type="number"
        placeholder="Fração — opcional"
        value={config.fracao}
        disabled={loading}
        onChange={(e) => set('fracao', e.target.value)}
        className={inputStyle}
      />

      <input
        type="number"
        placeholder="Permilagem — opcional"
        value={config.permilagem}
        disabled={loading}
        onChange={(e) => set('permilagem', e.target.value)}
        className={inputStyle}
      />

      <select
        value={config.status}
        disabled={loading}
        onChange={(e) => set('status', e.target.value as StatusType)}
        className={inputStyle}
      >
        <option value="vaga">Vaga</option>
        <option value="ocupada">Ocupada</option>
      </select>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
          <p className="text-sm font-medium text-zinc-900 mb-3">
            Preview — {preview.length} unidade{preview.length !== 1 ? 's' : ''}:
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.slice(0, 20).map((num) => (
              <span
                key={num}
                className="px-2 py-1 bg-white border border-zinc-200 rounded text-xs text-zinc-700"
              >
                {num}
              </span>
            ))}
            {preview.length > 20 && (
              <span className="px-2 py-1 text-xs text-zinc-500 self-center">
                +{preview.length - 20} mais...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
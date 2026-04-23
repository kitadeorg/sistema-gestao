'use client';

import { SingleForm, StatusType } from './index';

interface Props {
  form: SingleForm;
  setForm: React.Dispatch<React.SetStateAction<SingleForm>>;
  loading: boolean;
  disabled?: boolean;
}

const inputStyle =
  'w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed';

export default function ModoSingle({ form, setForm, loading, disabled = false }: Props) {
  const isDisabled = loading || disabled;

  const set = (field: keyof SingleForm, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value ?? '' }));

  return (
    <div className="space-y-4">
      <input
        placeholder="Número *"
        value={form.numero}
        disabled={isDisabled}
        onChange={(e) => set('numero', e.target.value)}
        className={inputStyle}
      />

      <input
        placeholder="Bloco"
        value={form.bloco}
        disabled={isDisabled}
        onChange={(e) => set('bloco', e.target.value)}
        className={inputStyle}
      />

      <select
        value={form.tipo}
        disabled={isDisabled}
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

      <input
        type="number"
        placeholder="Área (m²)"
        value={form.area}
        disabled={isDisabled}
        onChange={(e) => set('area', e.target.value)}
        className={inputStyle}
      />

      <input
        type="number"
        placeholder="Fração"
        value={form.fracao}
        disabled={isDisabled}
        onChange={(e) => set('fracao', e.target.value)}
        className={inputStyle}
      />

      <input
        type="number"
        placeholder="Permilagem"
        value={form.permilagem}
        disabled={isDisabled}
        onChange={(e) => set('permilagem', e.target.value)}
        className={inputStyle}
      />

      <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.ativaQuotaIndividual}
          disabled={isDisabled}
          onChange={(e) => set('ativaQuotaIndividual', e.target.checked)}
          className="rounded"
        />
        Ativar quota individual
      </label>

      {form.ativaQuotaIndividual && (
        <input
          type="number"
          placeholder="Valor quota individual"
          value={form.quotaIndividual}
          disabled={isDisabled}
          onChange={(e) => set('quotaIndividual', e.target.value)}
          className={inputStyle}
        />
      )}

      <select
        value={form.status}
        disabled={isDisabled}
        onChange={(e) => set('status', e.target.value as StatusType)}
        className={inputStyle}
      >
        <option value="vaga">Vaga</option>
        <option value="ocupada">Ocupada</option>
      </select>

      <textarea
        placeholder="Observações"
        value={form.observacoes}
        disabled={isDisabled}
        onChange={(e) => set('observacoes', e.target.value)}
        className={inputStyle}
        rows={3}
      />
    </div>
  );
}
interface Props {
  value: number;
  onChange: (amount: number) => void;
}

export default function AmountInput({ value, onChange }: Props) {
  const displayValue = value === 0 ? "" : String(value);

  function handleInput(e: Event) {
    const raw = (e.currentTarget as HTMLInputElement).value.replace(/[^\d]/g, "");
    onChange(raw === "" ? 0 : parseInt(raw, 10));
  }

  return (
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label for="total-amount" class="block text-sm font-semibold text-slate-500">
        合計金額
      </label>
      <div class="mt-2 flex items-end gap-1">
        <input
          id="total-amount"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          placeholder="0"
          value={displayValue}
          onInput={handleInput}
          class="w-full min-w-0 border-none bg-transparent p-0 text-4xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
        />
        <span class="pb-1 text-2xl font-bold text-slate-400">円</span>
      </div>
    </section>
  );
}

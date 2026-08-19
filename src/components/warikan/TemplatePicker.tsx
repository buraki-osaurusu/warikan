import { WARIKAN_TEMPLATES } from "../../lib/warikan/templates";

interface Props {
  selectedId: string | null;
  onSelect: (templateId: string) => void;
}

export default function TemplatePicker({ selectedId, onSelect }: Props) {
  return (
    <section class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-500">誰との割り勘？</h2>
      <div class="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {WARIKAN_TEMPLATES.map((t) => {
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={active}
              class={`flex min-h-11 touch-manipulation select-none flex-col items-start rounded-xl border px-2.5 py-2.5 text-left transition-transform active:scale-95 ${
                active
                  ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                  : "border-slate-200 bg-slate-50 active:bg-teal-50"
              }`}
            >
              <span class="text-sm font-bold text-slate-800">{t.label}</span>
              <span class="mt-0.5 text-[11px] leading-snug text-slate-500">{t.shortDescription}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

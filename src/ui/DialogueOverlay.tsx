import type { TranslationMap } from '../core/i18n';
import type { ActiveDialogue } from '../systems/contracts';

export function DialogueOverlay(props: {
  dialogue: ActiveDialogue;
  t: TranslationMap;
  onChoose: (idx: number) => void;
  onClose: () => void;
}) {
  const { dialogue, t, onChoose, onClose } = props;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-4 z-30 mx-auto w-[94%] max-w-2xl border border-[#d97b29]/55 bg-[#0e1012]/95 p-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#ece8df]/15 pb-2">
        <span className="font-display text-lg font-bold tracking-[0.12em] text-[#f28c28] uppercase">
          {dialogue.speaker}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs tracking-[0.1em] text-[#8d948a] uppercase hover:text-[#ece8df]"
        >
          {t.close} [Esc]
        </button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#ece8df] md:text-base">{dialogue.line}</p>

      <div className="mt-4 flex flex-col gap-2">
        {dialogue.choices.length > 0 ? (
          dialogue.choices.map((c, i) => (
            <button
              key={c.index}
              type="button"
              onClick={() => onChoose(c.index)}
              className="flex items-center gap-3 border border-[#ece8df]/20 bg-[#121618] px-4 py-2.5 text-left text-xs font-medium text-[#ece8df] transition-colors hover:border-[#f28c28] hover:bg-[#2a1d12] md:text-sm"
            >
              <span className="font-mono-code text-[#d97b29]">{i + 1}.</span>
              <span>{c.text}</span>
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="self-end border border-[#d97b29] bg-[#d97b29] px-5 py-2 text-xs font-bold tracking-[0.14em] text-[#0e1012] uppercase"
          >
            {t.close}
          </button>
        )}
      </div>
    </div>
  );
}

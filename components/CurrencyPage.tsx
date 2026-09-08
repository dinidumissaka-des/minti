"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Coins, Landmark } from "lucide-react";
import PushPage from "@/components/ui/PushPage";
import Surface from "@/components/Surface";
import { ListRow, RowValue } from "@/components/ui/ListRow";
import { CURRENCIES } from "@/lib/currencies";

interface Props {
  open: boolean;
  onClose: () => void;
  currency: string;
  onSelect: (code: string) => void;
  /** What an entry saved without a currency of its own is counted in. */
  baseCurrency: string;
  onSelectBase: (code: string) => void;
  onOpenConverter: () => void;
}

function CurrencyChoices({ selected, onPick }: { selected: string; onPick: (code: string) => void }) {
  return (
    <div className="pt-6">
      {CURRENCIES.map((c) => {
        const isSelected = c.code === selected;
        return (
          <button
            key={c.code}
            onClick={() => onPick(c.code)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl transition-[color,background-color,transform] duration-fast active:scale-[0.98] ${
              isSelected ? "text-accent bg-accent/10" : "text-ink hover:bg-ink/7"
            }`}
          >
            <span className="font-mono font-semibold text-base">{c.code}</span>
            <span className="flex items-center gap-2 text-sm text-ink/50">
              {c.name}
              {isSelected && <Check size={16} className="text-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Currency is two things — which code the app counts in, and what a figure is
// worth in another one — so it gets a page of its own rather than either being
// buried inside the other.
export default function CurrencyPage({
  open,
  onClose,
  currency,
  onSelect,
  baseCurrency,
  onSelectBase,
  onOpenConverter,
}: Props) {
  const [showList, setShowList] = useState(false);
  const [showBaseList, setShowBaseList] = useState(false);

  const name = CURRENCIES.find((c) => c.code === currency)?.name;

  return (
    <>
      <PushPage open={open} onClose={onClose} title="Currency" ariaLabel="Currency">
        {/* One card, same as a section on the account page: these rows are
            built from ListRow, which is full-bleed and expects a card edge to
            clip it. */}
        <div className="px-2 pt-6">
          <Surface borderRadius={28}>
            <div className="w-full divide-y divide-ink/10">
              <ListRow
                icon={<Coins size={20} />}
                label="Change currency"
                description={name}
                trailing={<RowValue>{currency}</RowValue>}
                onClick={() => setShowList(true)}
              />
              {/* Set once from whatever was on screen the first time the app
                  ran, and until now there was no way to see it, let alone
                  correct it — so an account that happened to be showing LKR
                  that day read its whole AED history as rupees. */}
              <ListRow
                icon={<Landmark size={20} />}
                label="Base currency"
                description="What older entries were recorded in"
                trailing={<RowValue>{baseCurrency}</RowValue>}
                onClick={() => setShowBaseList(true)}
              />
              <ListRow
                icon={<ArrowLeftRight size={20} />}
                label="Convert currency"
                description="What an amount is worth elsewhere"
                onClick={onOpenConverter}
              />
            </div>
          </Surface>
        </div>
      </PushPage>

      {/* Picking a code leaves this page standing, so the row behind it shows
          the change that was just made. */}
      <PushPage
        open={showList}
        onClose={() => setShowList(false)}
        title="Change currency"
        ariaLabel="Change currency"
      >
        <CurrencyChoices selected={currency} onPick={(code) => { onSelect(code); setShowList(false); }} />
      </PushPage>

      {/* Declared after the page above so it paints on top — pushed pages all
          share one z-index. */}
      <PushPage
        open={showBaseList}
        onClose={() => setShowBaseList(false)}
        title="Base currency"
        ariaLabel="Base currency"
      >
        <div className="px-4 pt-6">
          <p className="font-sans text-sm text-muted">
            Entries saved before amounts carried a currency are counted in this one. Changing it
            re-reads that history — it does not convert it — so pick what you were actually
            spending in.
          </p>
        </div>
        <CurrencyChoices selected={baseCurrency} onPick={(code) => { onSelectBase(code); setShowBaseList(false); }} />
      </PushPage>

    </>
  );
}

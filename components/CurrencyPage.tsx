"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Coins } from "lucide-react";
import PushPage from "@/components/ui/PushPage";
import Surface from "@/components/Surface";
import { ListRow, RowValue } from "@/components/ui/ListRow";
import { CURRENCIES } from "@/lib/currencies";

interface Props {
  open: boolean;
  onClose: () => void;
  currency: string;
  onSelect: (code: string) => void;
  onOpenConverter: () => void;
}

// Currency is two things — which code the app counts in, and what a figure is
// worth in another one — so it gets a page of its own rather than either being
// buried inside the other.
export default function CurrencyPage({ open, onClose, currency, onSelect, onOpenConverter }: Props) {
  const [showList, setShowList] = useState(false);

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
                icon={<Coins size={18} />}
                label="Change currency"
                description={name}
                trailing={<RowValue>{currency}</RowValue>}
                onClick={() => setShowList(true)}
              />
              <ListRow
                icon={<ArrowLeftRight size={18} />}
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
        <div className="pt-6">
          {CURRENCIES.map((c) => {
            const selected = c.code === currency;
            return (
              <button
                key={c.code}
                onClick={() => { onSelect(c.code); setShowList(false); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl transition-[color,background-color,transform] duration-fast active:scale-[0.98] ${
                  selected ? "text-accent bg-accent/10" : "text-ink hover:bg-ink/7"
                }`}
              >
                <span className="font-mono font-semibold text-base">{c.code}</span>
                <span className="flex items-center gap-2 text-sm text-ink/50">
                  {c.name}
                  {selected && <Check size={16} className="text-accent" />}
                </span>
              </button>
            );
          })}
        </div>
      </PushPage>
    </>
  );
}

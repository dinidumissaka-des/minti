"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { addSubscription, deleteSubscription, updateSubscription } from "@/lib/supabase";
import { hapticBump, hapticSuccess } from "@/lib/haptics";
import { formatAmount } from "@/lib/currencies";
import { CATEGORY_COLORS } from "@/lib/categories";
import GlassSurface from "@/components/GlassSurface";
import { usePrivacy } from "@/components/PrivacyContext";
import BottomDrawer from "@/components/BottomDrawer";
import Collapse from "@/components/ui/Collapse";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { CategoryList } from "@/components/ui/DrawerPickers";
import type { Subscription, NewSubscription } from "@/types";

const PRESET_CATEGORIES = Object.keys(CATEGORY_COLORS);
// Matches the row collapse transition below; keep the two in step.
const ROW_EXIT_MS = 200;

interface Props {
  subscriptions: Subscription[];
  userId: string;
  currency: string;
  onChanged: () => void;
}

interface EditState {
  name: string;
  amount: string;
  category: string;
}

export default function SubscriptionList({ subscriptions, userId, currency, onChanged }: Props) {
  const { mask } = usePrivacy();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCatDrawer, setShowAddCatDrawer] = useState(false);
  const [showEditCatDrawer, setShowEditCatDrawer] = useState(false);

  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState(PRESET_CATEGORIES[0]);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const monthlyTotal = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent, subId: string) {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (deltaY > 40) return;
    if (deltaX > 50) { hapticBump(); setSwipedId(subId); }
    else if (deltaX < -20) setSwipedId(null);
  }

  async function handleAdd() {
    const parsed = parseFloat(newAmount);
    if (!newName.trim() || isNaN(parsed) || parsed <= 0) return;
    setAdding(true);
    try {
      const data: NewSubscription = { name: newName.trim(), amount: parsed, category: newCategory, billing_day: 1 };
      await addSubscription(data, userId);
      setNewName(""); setNewAmount(""); setNewCategory(PRESET_CATEGORIES[0]);
      setShowAdd(false);
      hapticSuccess();
      onChanged();
    } finally {
      setAdding(false);
    }
  }

  function startEdit(sub: Subscription) {
    setSwipedId(null);
    setEditingId(sub.id);
    setEditState({ name: sub.name, amount: String(sub.amount), category: sub.category });
  }

  async function handleSave(id: string) {
    if (!editState) return;
    const parsed = parseFloat(editState.amount);
    if (!editState.name.trim() || isNaN(parsed) || parsed <= 0) return;
    setSaving(true);
    try {
      await updateSubscription(id, { name: editState.name.trim(), amount: parsed, category: editState.category });
      setEditingId(null); setEditState(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  // Collapse the row before the request, so the list closes the gap smoothly
  // instead of snapping once the delete resolves.
  async function handleDelete(id: string) {
    hapticBump();
    setSwipedId(null);
    setDeletingId(id);
    setRemovingId(id);
    await new Promise((resolve) => setTimeout(resolve, ROW_EXIT_MS));
    try {
      await deleteSubscription(id);
      onChanged();
    } finally {
      setDeletingId(null);
      setRemovingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4" onClick={() => setSwipedId(null)}>
      {subscriptions.length > 0 && (
        <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
          <div className="px-5 py-4 flex items-center justify-between w-full">
            <span className="font-sans text-xs text-muted font-semibold">Monthly Recurring</span>
            <AnimatedNumber
              value={monthlyTotal}
              format={(v) => formatAmount(v, currency)}
              className="font-mono text-lg font-bold text-ink"
            />
          </div>
          <div className="w-full divide-y divide-ink/10 border-t border-ink/10">
            {subscriptions.map((sub, i) => {
              if (editingId === sub.id && editState) {
                return (
                  <div key={sub.id} className="px-4 py-3 flex flex-col gap-3 animate-row-in">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-base text-ink placeholder:text-muted outline-none focus:border-ink/40"
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        placeholder="Name"
                        aria-label="Subscription name"
                        autoFocus
                      />
                      <input
                        type="number"
                        className="w-28 bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-base text-ink outline-none focus:border-ink/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={editState.amount}
                        onChange={(e) => setEditState({ ...editState, amount: e.target.value })}
                        placeholder="Amount"
                        aria-label="Amount"
                        min="0.01" step="0.01"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => setShowEditCatDrawer(true)}
                        className="flex-1 h-11 flex items-center px-3 rounded-lg border border-ink/10 bg-ink/7 text-body text-ink text-left"
                      >
                        {editState.category}
                      </button>
                      <button onClick={() => handleSave(sub.id)} disabled={saving} aria-label="Save changes"
                        className="w-11 h-11 flex items-center justify-center rounded-lg bg-accent-fill text-accent-on hover:bg-accent-fill/85 disabled:opacity-50 flex-shrink-0">
                        <Check size={15} />
                      </button>
                      <button onClick={() => { setEditingId(null); setEditState(null); }} aria-label="Cancel editing"
                        className="w-11 h-11 flex items-center justify-center rounded-lg border border-ink/10 text-muted hover:text-ink flex-shrink-0">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              }

              const isSwiped = swipedId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`grid transition-[grid-template-rows,opacity] duration-base ease-out ${
                    removingId === sub.id ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                  }`}
                >
                <div className="min-h-0 overflow-hidden">
                <div
                  className="relative overflow-hidden group animate-row-in"
                  style={{ animationDelay: `${Math.min(i * 35, 280)}ms` }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, sub.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Swipe action buttons (mobile) */}
                  <div className={`absolute right-0 top-0 bottom-0 flex items-center gap-1 px-2 sm:hidden transition-opacity duration-200 ${isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <button
                      onClick={() => startEdit(sub)}
                      aria-label="Edit subscription"
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-ink/10 text-ink"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      disabled={deletingId === sub.id}
                      aria-label="Delete subscription"
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-danger-fill/20 text-danger disabled:opacity-30"
                    >
                      {deletingId === sub.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>

                  {/* Row content */}
                  <div
                    className="flex items-center gap-3 px-4 py-4 sm:hover:bg-ink/5 transition-all duration-200"
                    style={{ transform: isSwiped ? "translateX(-88px)" : "translateX(0)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-body font-sans truncate">{sub.name}</p>
                      <span className="inline-block mt-0.5 text-xs font-mono px-1.5 py-0.5 rounded-full bg-ink/10 text-ink/50">
                        {sub.category}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-ink flex-shrink-0">
                      {mask(formatAmount(Number(sub.amount), currency))}<span className="text-muted text-xs">/mo</span>
                    </span>
                    {/* Hover actions (desktop) */}
                    <div className="hidden sm:flex gap-1 overflow-hidden w-0 group-hover:w-reveal transition-all duration-200 flex-shrink-0">
                      <button onClick={() => startEdit(sub)} aria-label="Edit"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink transition-colors flex-shrink-0">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(sub.id)} disabled={deletingId === sub.id} aria-label="Delete"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger disabled:opacity-30 transition-colors flex-shrink-0">
                        {deletingId === sub.id ? <span className="text-sm">…</span> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                </div>
              );
            })}
          </div>
        </GlassSurface>
      )}

      <Collapse open={showAdd}>
        <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
          <div className="p-4 flex flex-col gap-3 w-full">
            <input
              className="w-full bg-ink/7 border border-ink/10 rounded-lg px-3 h-10 text-base text-ink placeholder:text-muted outline-none focus:border-ink/40"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Netflix)"
              aria-label="Subscription name"
              autoFocus
            />
            <input
              type="number"
              className="w-full bg-ink/7 border border-ink/10 rounded-lg px-3 h-10 text-base text-ink outline-none focus:border-ink/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Amount"
              aria-label="Amount"
              min="0.01" step="0.01"
            />
            <button
              type="button"
              onClick={() => setShowAddCatDrawer(true)}
              className="h-10 flex items-center px-3 rounded-full border border-ink/10 bg-ink/5 hover:border-ink/25 text-sm text-ink transition-colors"
            >
              {newCategory}
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full bg-accent-fill text-accent-on font-semibold text-sm disabled:opacity-50"
              >
                {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {adding ? "Adding…" : "Add Subscription"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="h-10 px-4 rounded-full border border-ink/10 bg-ink/5 text-muted text-sm hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </GlassSurface>
      </Collapse>

      <Collapse open={!showAdd}>
        <button
          onClick={() => setShowAdd(true)}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-full border border-dashed flat-chip-dashed text-muted text-sm hover:text-ink transition-[color,transform] duration-fast active:scale-[0.98]"
        >
          <Plus size={14} />
          Add Subscription
        </button>
      </Collapse>

      {subscriptions.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-slide-in">
          <span className="text-4xl mb-3" aria-hidden="true">🔄</span>
          <p className="font-sans font-semibold text-lg text-muted">No subscriptions yet</p>
          <p className="font-sans text-sm text-muted mt-1">Add rent, Netflix, gym — anything recurring.</p>
        </div>
      )}

      <BottomDrawer open={showAddCatDrawer} onClose={() => setShowAddCatDrawer(false)} title="Category">
        <CategoryList selected={newCategory} onSelect={(cat) => { setNewCategory(cat); setShowAddCatDrawer(false); }} />
      </BottomDrawer>

      <BottomDrawer open={showEditCatDrawer} onClose={() => setShowEditCatDrawer(false)} title="Category">
        {editState && (
          <CategoryList
            selected={editState.category}
            onSelect={(cat) => { setEditState({ ...editState, category: cat }); setShowEditCatDrawer(false); }}
          />
        )}
      </BottomDrawer>
    </div>
  );
}

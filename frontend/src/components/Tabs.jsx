import React from "react";
import { Plus, X } from "lucide-react";

/*
 * Honest semantics: these behave like toggle buttons that swap the whole
 * dashboard, not like an ARIA tablist (no arrow-key pattern, no tabpanel),
 * so they are exposed as a toolbar of pressed/unpressed buttons.
 */
export default function Tabs({ portfolios, activeId, onSelect, onCreate, onDelete }) {
  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div role="toolbar" aria-label="Portfolios" className="flex min-w-max items-center gap-1.5">
        {portfolios.map((p) => {
          const active = p.id === activeId;
          return (
            <span key={p.id} className="group relative inline-flex">
              <button
                aria-pressed={active}
                onClick={() => onSelect(p.id)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                  active
                    ? "bg-ink text-bg"
                    : "border border-line text-ink2 hover:border-linestrong hover:text-ink"
                } ${!p.preset ? "pr-8" : ""}`}
              >
                {p.name}
              </button>
              {!p.preset && (
                <button
                  aria-label={`Delete ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition ${
                    active
                      ? "text-bg opacity-60 hover:opacity-100"
                      : "text-ink3 opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  }`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </span>
          );
        })}
        <button
          onClick={onCreate}
          aria-label="Create portfolio"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-linestrong text-ink3 transition hover:border-ink3 hover:text-ink"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

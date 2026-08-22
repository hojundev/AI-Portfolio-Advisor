import { AlertCircle, X } from "lucide-react";

export default function ErrorToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed right-4 top-4 z-[100] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-rose-500/20 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0 text-rose-400" size={19} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Something went wrong</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">{message}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Dismiss error">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
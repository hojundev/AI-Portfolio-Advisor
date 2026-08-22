import { LoaderCircle } from "lucide-react";

export default function Spinner({ label = "Loading…" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoaderCircle className="animate-spin" size={15} />
      {label}
    </span>
  );
}
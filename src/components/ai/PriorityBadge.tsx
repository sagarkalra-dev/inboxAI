import { priorityClass, priorityLabel } from "@/lib/util";
import type { Priority } from "@/lib/email/types";

export function PriorityBadge({ priority }: { priority?: Priority }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityClass(priority)}`}
    >
      {priorityLabel(priority)}
    </span>
  );
}

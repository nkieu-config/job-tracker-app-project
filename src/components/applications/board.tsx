"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { STATUS_COLORS } from "@/components/ui/status-colors";
import { isOneOf } from "@/lib/guards";
import { updateApplicationStatus } from "@/actions/applications";
import { useToast } from "@/components/ui/toast";

export type BoardApplication = {
  id: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  deadline: string | null;
};

function CardContent({ app }: { app: BoardApplication }) {
  return (
    <>
      <p className="truncate font-sans text-body font-bold text-ink">
        {app.role}
      </p>
      <p className="mt-1 truncate font-sans text-caption text-ink-mute">
        {app.company}
      </p>
      {app.deadline && (
        <p className="mt-2 font-sans text-fine font-medium tabular-nums text-ink-mute">
          Due {app.deadline}
        </p>
      )}
    </>
  );
}

// The drag affordance is its own button rather than the card wrapper: dnd-kit's
// `attributes` add role="button" and tabIndex=0, and putting those on an element
// that wraps the card's <Link> would nest one interactive control inside another
// and give every card two tab stops.
function BoardCard({ app, dragging }: { app: BoardApplication; dragging: boolean }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    <div ref={setNodeRef} className={`relative ${isDragging ? "opacity-40" : ""}`}>
      <Link
        href={`/dashboard/applications/${app.id}`}
        draggable={false}
        tabIndex={dragging ? -1 : 0}
        className="block rounded-xl border border-hairline bg-canvas py-3 pl-4 pr-10 shadow-sm transition-shadow hover:shadow-[0_5px_20px_rgba(0,0,0,0.08)]"
      >
        <CardContent app={app} />
      </Link>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Reorder ${app.role} at ${app.company}`}
        className="absolute right-1 top-1 cursor-grab touch-none rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-canvas-lavender hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function BoardColumn({
  status,
  apps,
  dragging,
}: {
  status: ApplicationStatus;
  apps: BoardApplication[];
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = STATUS_COLORS[status];

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${colors.dot}`} aria-hidden="true" />
        <h3 className="font-sans text-caption font-bold uppercase tracking-wider text-ink-mute">
          {STATUS_LABELS[status]}
        </h3>
        <span className="font-sans text-caption font-bold tabular-nums text-ink-mute">
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[160px] flex-1 flex-col gap-2 rounded-2xl p-2 transition-colors ${
          isOver ? "bg-canvas-lavender" : "bg-canvas-cream/50"
        }`}
      >
        {apps.map((app) => (
          <BoardCard key={app.id} app={app} dragging={dragging} />
        ))}
        {apps.length === 0 && (
          <p className="m-auto px-3 py-6 text-center font-sans text-caption text-ink-mute">
            {dragging ? "Drop here" : "No applications"}
          </p>
        )}
      </div>
    </div>
  );
}

export function ApplicationsBoard({
  applications,
}: {
  applications: BoardApplication[];
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticApps, moveOptimistic] = useOptimistic(
    applications,
    (state, move: { id: string; status: ApplicationStatus }) =>
      state.map((app) =>
        app.id === move.id ? { ...app, status: move.status } : app,
      ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const id = String(event.active.id);
    const target = event.over?.id;
    if (!isOneOf(APPLICATION_STATUSES, target)) return;
    const app = optimisticApps.find((a) => a.id === id);
    if (!app || app.status === target) return;

    startTransition(async () => {
      moveOptimistic({ id, status: target });
      try {
        const result = await updateApplicationStatus(id, target);
        if (result.error) {
          toast(result.error, "error");
        } else {
          toast(`Moved to ${STATUS_LABELS[target]}.`);
        }
      } catch {
        // An error thrown inside an async transition reaches the nearest error
        // boundary. A dropped connection shouldn't replace the whole board —
        // the optimistic move reverts on its own once the transition settles.
        toast("Couldn't move the card. Check your connection.", "error");
      }
    });
  }

  const activeApp = activeId
    ? optimisticApps.find((a) => a.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {APPLICATION_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            apps={optimisticApps.filter((app) => app.status === status)}
            dragging={activeId !== null}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp && (
          <div className="rounded-xl border border-primary bg-canvas px-4 py-3 shadow-[0_10px_30px_rgba(74,21,75,0.2)]">
            <CardContent app={activeApp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

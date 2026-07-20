"use client";

import { useState, useTransition, useOptimistic, useMemo } from "react";
import Link from "next/link";
import { GripVertical, ChevronDown } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { STATUS_COLORS } from "@/components/ui/status-colors";
import { DEADLINE_TONE_CLASS } from "@/components/ui/deadline";
import type { DeadlineTone } from "@/lib/format";
import { isOneOf } from "@/lib/guards";
import { cn } from "@/lib/cn";
import { updateApplicationStatus } from "@/actions/applications";
import { useToast } from "@/components/ui/toast";

export type BoardApplication = {
  id: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  deadline: { label: string; tone: DeadlineTone } | null;
};

const ACTIVE_STATUSES = APPLICATION_STATUSES.filter(
  (s) => s !== "REJECTED",
) as Exclude<ApplicationStatus, "REJECTED">[];

function CardContent({ app }: { app: BoardApplication }) {
  return (
    <>
      <p className="truncate font-sans text-body font-semibold text-ink">
        {app.role}
      </p>
      <p className="mt-0.5 truncate font-sans text-fine text-ink-mute">
        {app.company}
      </p>
      {app.deadline && (
        <p
          className={`mt-1.5 font-mono text-fine tabular-nums ${DEADLINE_TONE_CLASS[app.deadline.tone]}`}
        >
          {app.deadline.label}
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
        className="block rounded-xl border border-hairline bg-canvas py-2.5 pl-3 pr-9 transition-colors hover:border-primary"
      >
        <CardContent app={app} />
      </Link>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Reorder ${app.role} at ${app.company}`}
        className="absolute right-1 top-1 cursor-grab touch-none rounded-md p-1.5 text-ink-mute transition-colors hover:bg-canvas-lavender hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
      >
        <GripVertical size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function SectionHeader({
  status,
  count,
  collapsed,
  onToggle,
  trailing,
}: {
  status: ApplicationStatus;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="flex w-full items-center gap-2 px-0.5 text-left"
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${STATUS_COLORS[status].dot}`}
        aria-hidden="true"
      />
      <h3 className="font-sans text-fine font-semibold uppercase tracking-wide text-ink-mute">
        {STATUS_LABELS[status]}
      </h3>
      <span className="font-mono text-fine tabular-nums text-ink-mute">
        {count}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {trailing}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            "text-ink-mute transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </span>
    </button>
  );
}

function BoardColumn({
  status,
  apps,
  dragging,
  collapsed,
  onToggle,
}: {
  status: ApplicationStatus;
  apps: BoardApplication[];
  dragging: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const show = dragging || !collapsed;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 lg:w-60">
      <SectionHeader
        status={status}
        count={apps.length}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-1 flex-col gap-2 rounded-xl p-1.5 transition-colors lg:min-h-30",
          isOver && "bg-canvas-lavender-hover",
          !show && "hidden",
        )}
      >
        {apps.map((app) => (
          <BoardCard key={app.id} app={app} dragging={dragging} />
        ))}
        {apps.length === 0 && (
          <p className="m-auto px-3 py-6 text-center font-sans text-fine text-ink-mute">
            {dragging ? "Drop here" : "Empty"}
          </p>
        )}
      </div>
    </div>
  );
}

function RejectedStrip({
  apps,
  dragging,
  collapsed,
  onToggle,
}: {
  apps: BoardApplication[];
  dragging: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "REJECTED" });
  const show = dragging || !collapsed;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-hairline px-3 py-2.5 transition-colors",
        isOver ? "bg-canvas-lavender-hover" : "bg-canvas-lavender",
      )}
    >
      <SectionHeader
        status="REJECTED"
        count={apps.length}
        collapsed={collapsed}
        onToggle={onToggle}
        trailing={
          dragging ? (
            <span className="font-sans text-fine text-ink-mute">
              Drop to reject
            </span>
          ) : null
        }
      />
      {apps.length > 0 && (
        <div
          className={cn(
            "mt-2 flex flex-col gap-2 lg:flex-row lg:overflow-x-auto lg:pb-1",
            !show && "hidden",
          )}
        >
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/applications/${app.id}`}
              className="w-full shrink-0 rounded-lg border border-hairline bg-canvas px-3 py-1.5 transition-colors hover:border-primary lg:w-40"
            >
              <p className="truncate font-sans text-fine font-medium text-ink">
                {app.role}
              </p>
              <p className="truncate font-sans text-fine text-ink-mute">
                {app.company}
              </p>
            </Link>
          ))}
        </div>
      )}
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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
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

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
  const dragging = activeId !== null;

  const announcements = useMemo<Announcements>(() => {
    const card = (id: string | number) => {
      const app = optimisticApps.find((a) => a.id === String(id));
      return app ? `${app.role} at ${app.company}` : "this application";
    };
    const column = (id: string | number | undefined) =>
      isOneOf(APPLICATION_STATUSES, id) ? STATUS_LABELS[id] : null;

    return {
      onDragStart: ({ active }) =>
        `Picked up ${card(active.id)}. Use the arrow keys to pick a column, then press space to drop.`,
      onDragOver: ({ active, over }) => {
        const target = column(over?.id);
        return target
          ? `${card(active.id)} is over ${target}.`
          : `${card(active.id)} is not over a column.`;
      },
      onDragEnd: ({ active, over }) => {
        const target = column(over?.id);
        return target
          ? `Moved ${card(active.id)} to ${target}.`
          : `Dropped ${card(active.id)}. It stayed where it was.`;
      },
      onDragCancel: ({ active }) =>
        `Cancelled moving ${card(active.id)}. It stayed where it was.`,
    };
  }, [optimisticApps]);

  return (
    <DndContext
      sensors={sensors}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:overflow-x-auto lg:pb-1">
          {ACTIVE_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              apps={optimisticApps.filter((app) => app.status === status)}
              dragging={dragging}
              collapsed={collapsed.has(status)}
              onToggle={() => toggle(status)}
            />
          ))}
        </div>
        <RejectedStrip
          apps={optimisticApps.filter((app) => app.status === "REJECTED")}
          dragging={dragging}
          collapsed={collapsed.has("REJECTED")}
          onToggle={() => toggle("REJECTED")}
        />
      </div>
      <DragOverlay>
        {activeApp && (
          <div className="w-60 rounded-xl border border-primary bg-canvas py-2.5 pl-3 pr-9 shadow-[0_10px_30px_rgba(74,21,75,0.2)]">
            <CardContent app={activeApp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

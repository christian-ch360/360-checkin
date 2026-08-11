"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskPriorityBadge } from "@/features/agencies/components/crm-status-badge";
import { createCampaignTask, updateCampaignTaskStatus, deleteCampaignTask } from "@/features/agencies/services/agency-task-actions";
import type { CampaignTaskItem } from "@/features/agencies/services/agency-task.service";
import type { TaskPriority } from "@prisma/client";

const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function CampaignTasksPanel({
  campaignId,
  tasks,
  canManage,
}: {
  campaignId: string;
  tasks: CampaignTaskItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [isPending, startTransition] = useTransition();

  function addTask() {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createCampaignTask(campaignId, { title: title.trim(), priority });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTitle("");
      setPriority("MEDIUM");
      router.refresh();
    });
  }

  function setStatus(taskId: string, status: string) {
    startTransition(async () => {
      const result = await updateCampaignTaskStatus(taskId, status);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(taskId: string) {
    startTransition(async () => {
      const result = await deleteCampaignTask(taskId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex items-center gap-2">
          <Input placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!title.trim() || isPending} onClick={addTask}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {task.dueDate && <p className="text-xs text-muted-foreground">Due {format(task.dueDate, "MMM d, yyyy")}</p>}
              </div>
              <TaskPriorityBadge priority={task.priority} />
              <Select value={task.status} onValueChange={(v) => setStatus(task.id, v)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(task.id)}
                  disabled={isPending}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

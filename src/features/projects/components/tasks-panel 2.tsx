"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { createTask, updateTaskStatus } from "@/features/projects/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const COLUMNS = ["todo", "in_progress", "done"] as const;

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
};

export function TasksPanel({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  function handleAdd() {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createTask(projectId, { title, status: "todo" });
      if (!result.success) toast.error(result.error);
      setTitle("");
      router.refresh();
    });
  }

  function changeStatus(taskId: string, status: string) {
    startTransition(async () => {
      await updateTaskStatus(projectId, taskId, status);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={isPending}>
          <Plus /> Add
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const tasksInColumn = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {STATUS_LABELS[col]} · {tasksInColumn.length}
              </p>
              <div className="space-y-2">
                {tasksInColumn.map((task) => (
                  <div key={task.id} className="rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.dueDate && (
                      <p className="mt-1 text-xs text-muted-foreground">Due {format(task.dueDate, "MMM d")}</p>
                    )}
                    <Select value={task.status} onValueChange={(v) => changeStatus(task.id, v)}>
                      <SelectTrigger className="mt-2 h-7 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {STATUS_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {tasksInColumn.length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

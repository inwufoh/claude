"use client";

import { Loader2 } from "lucide-react";

interface ToolArgs {
  command?: string;
  path?: string;
  new_path?: string;
}

function getLabel(toolName: string, args: ToolArgs): string {
  const filename = args.path?.split("/").pop() ?? args.path ?? "";

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Reading ${filename}`;
      case "undo_edit":
        return `Reverting ${filename}`;
      default:
        return filename ? `Working on ${filename}` : "Working on files";
    }
  }

  if (toolName === "file_manager") {
    const newFilename = args.new_path?.split("/").pop() ?? args.new_path ?? "";
    switch (args.command) {
      case "rename":
        return newFilename
          ? `Renaming ${filename} to ${newFilename}`
          : `Renaming ${filename}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return filename ? `Working on ${filename}` : "Working on files";
    }
  }

  return toolName;
}

interface ToolInvocationStatusProps {
  toolName: string;
  args: ToolArgs;
  isDone: boolean;
}

export function ToolInvocationStatus({
  toolName,
  args,
  isDone,
}: ToolInvocationStatusProps) {
  const label = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

export { getLabel };

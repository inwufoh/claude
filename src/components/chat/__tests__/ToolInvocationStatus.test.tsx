import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationStatus, getLabel } from "../ToolInvocationStatus";

afterEach(() => {
  cleanup();
});

// --- getLabel unit tests ---

test("getLabel: str_replace_editor create returns Creating <filename>", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/src/Button.tsx" })).toBe("Creating Button.tsx");
});

test("getLabel: str_replace_editor str_replace returns Editing <filename>", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "/src/App.tsx" })).toBe("Editing App.tsx");
});

test("getLabel: str_replace_editor insert returns Editing <filename>", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "/src/styles.css" })).toBe("Editing styles.css");
});

test("getLabel: str_replace_editor view returns Reading <filename>", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "/src/utils.ts" })).toBe("Reading utils.ts");
});

test("getLabel: str_replace_editor undo_edit returns Reverting <filename>", () => {
  expect(getLabel("str_replace_editor", { command: "undo_edit", path: "/src/index.ts" })).toBe("Reverting index.ts");
});

test("getLabel: str_replace_editor unknown command with path returns Working on <filename>", () => {
  expect(getLabel("str_replace_editor", { path: "/src/foo.ts" })).toBe("Working on foo.ts");
});

test("getLabel: str_replace_editor no path or command returns Working on files", () => {
  expect(getLabel("str_replace_editor", {})).toBe("Working on files");
});

test("getLabel: file_manager rename returns Renaming <old> to <new>", () => {
  expect(getLabel("file_manager", { command: "rename", path: "/src/Old.tsx", new_path: "/src/New.tsx" })).toBe("Renaming Old.tsx to New.tsx");
});

test("getLabel: file_manager rename without new_path omits 'to' clause", () => {
  expect(getLabel("file_manager", { command: "rename", path: "/src/Foo.tsx" })).toBe("Renaming Foo.tsx");
});

test("getLabel: file_manager delete returns Deleting <filename>", () => {
  expect(getLabel("file_manager", { command: "delete", path: "/src/Dead.tsx" })).toBe("Deleting Dead.tsx");
});

test("getLabel: file_manager unknown command with path returns Working on <filename>", () => {
  expect(getLabel("file_manager", { path: "/src/thing.ts" })).toBe("Working on thing.ts");
});

test("getLabel: unknown toolName returns the toolName as-is", () => {
  expect(getLabel("some_other_tool", { path: "/src/foo.ts" })).toBe("some_other_tool");
});

test("getLabel: extracts basename from nested path", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Card.tsx" })).toBe("Creating Card.tsx");
});

// --- ToolInvocationStatus render tests ---

test("shows spinner and label when not done", () => {
  render(
    <ToolInvocationStatus
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Button.tsx" }}
      isDone={false}
    />
  );

  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  expect(document.querySelector(".animate-spin")).toBeTruthy();
  expect(document.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot and label when done", () => {
  render(
    <ToolInvocationStatus
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Button.tsx" }}
      isDone={true}
    />
  );

  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  expect(document.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(document.querySelector(".animate-spin")).toBeNull();
});

test("renders file_manager delete label", () => {
  render(
    <ToolInvocationStatus
      toolName="file_manager"
      args={{ command: "delete", path: "/src/OldComponent.tsx" }}
      isDone={true}
    />
  );

  expect(screen.getByText("Deleting OldComponent.tsx")).toBeDefined();
});

test("renders file_manager rename label", () => {
  render(
    <ToolInvocationStatus
      toolName="file_manager"
      args={{ command: "rename", path: "/src/Foo.tsx", new_path: "/src/Bar.tsx" }}
      isDone={false}
    />
  );

  expect(screen.getByText("Renaming Foo.tsx to Bar.tsx")).toBeDefined();
});

test("renders editing label for str_replace", () => {
  render(
    <ToolInvocationStatus
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/App.tsx" }}
      isDone={false}
    />
  );

  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

import { expect, test } from "vitest";
import { text, confirm, select } from "../src/index.js";

test("text() creates a text action with correct shape", () => {
  const action = text("name", "What is your name?");
  expect(action).toEqual({
    type: "text",
    id: "name",
    question: "What is your name?",
  });
});

test("text() with options", () => {
  const action = text("email", "Enter email", {
    placeholder: "user@example.com",
    default: "admin@test.com",
  });
  expect(action).toEqual({
    type: "text",
    id: "email",
    question: "Enter email",
    placeholder: "user@example.com",
    default: "admin@test.com",
  });
});

test("confirm() creates a confirm action", () => {
  const action = confirm("ts", "Use TypeScript?");
  expect(action).toEqual({
    type: "confirm",
    id: "ts",
    question: "Use TypeScript?",
  });
});

test("confirm() with default", () => {
  const action = confirm("lint", "Use linter?", { default: true });
  expect(action).toEqual({
    type: "confirm",
    id: "lint",
    question: "Use linter?",
    default: true,
  });
});

test("select() creates a select action", () => {
  const action = select("framework", "Choose framework", ["react", "vue", "svelte"]);
  expect(action).toEqual({
    type: "select",
    id: "framework",
    question: "Choose framework",
    options: ["react", "vue", "svelte"],
  });
});

test("select() with default", () => {
  const action = select("style", "Choose style", ["light", "dark"] as const, { default: "dark" });
  expect(action).toEqual({
    type: "select",
    id: "style",
    question: "Choose style",
    options: ["light", "dark"],
    default: "dark",
  });
});

import { expect, test } from "vitest";
import { text, confirm, select } from "../src/index.js";

test("text() creates a text prompt with correct shape", () => {
  const prompt = text("name", "What is your name?");
  expect(prompt).toEqual({
    type: "text",
    id: "name",
    question: "What is your name?",
  });
});

test("text() with options", () => {
  const prompt = text("email", "Enter email", {
    placeholder: "user@example.com",
    default: "admin@test.com",
  });
  expect(prompt).toEqual({
    type: "text",
    id: "email",
    question: "Enter email",
    placeholder: "user@example.com",
    default: "admin@test.com",
  });
});

test("confirm() creates a confirm prompt", () => {
  const prompt = confirm("ts", "Use TypeScript?");
  expect(prompt).toEqual({
    type: "confirm",
    id: "ts",
    question: "Use TypeScript?",
  });
});

test("confirm() with default", () => {
  const prompt = confirm("lint", "Use linter?", { default: true });
  expect(prompt).toEqual({
    type: "confirm",
    id: "lint",
    question: "Use linter?",
    default: true,
  });
});

test("select() creates a select prompt", () => {
  const prompt = select("framework", "Choose framework", ["react", "vue", "svelte"]);
  expect(prompt).toEqual({
    type: "select",
    id: "framework",
    question: "Choose framework",
    options: ["react", "vue", "svelte"],
  });
});

test("select() with default", () => {
  const prompt = select("style", "Choose style", ["light", "dark"] as const, { default: "dark" });
  expect(prompt).toEqual({
    type: "select",
    id: "style",
    question: "Choose style",
    options: ["light", "dark"],
    default: "dark",
  });
});

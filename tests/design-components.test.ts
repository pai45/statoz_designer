import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as actions from "../src/design-system/components/actions";
import * as elements from "../src/design-system/components/elements";
import { actionCatalog, elementCatalog } from "../src/domain/brand-guide";
import { catalogDemos } from "../src/features/studio/brand-actions-section";

const html = (node: ReactNode) => renderToStaticMarkup(node);

test("every catalog entry names a real component and has a live demo", () => {
  for (const entry of actionCatalog) assert.equal(typeof (actions as Record<string, unknown>)[entry.component], "function", `${entry.component} is not exported from actions.tsx`);
  for (const entry of elementCatalog) assert.equal(typeof (elements as Record<string, unknown>)[entry.component], "function", `${entry.component} is not exported from elements.tsx`);
  const ids = [...actionCatalog, ...elementCatalog].map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length, "catalog ids are unique");
  assert.deepEqual(Object.keys(catalogDemos).sort(), [...ids].sort(), "each catalog entry has exactly one demo");
  for (const [id, demo] of Object.entries(catalogDemos)) assert.ok(html(createElement(() => demo())).length > 0, `${id} renders`);
});

test("action buttons carry their variant, state and accent", () => {
  const primary = html(createElement(actions.ActionButton, { glow: true }, "Play"));
  assert.match(primary, /class="action action-solid action-md is-glow"/);
  assert.match(primary, /type="button"/);
  const pending = html(createElement(actions.ActionButton, { pending: true, variant: "tonal", accent: "var(--ds-color-danger)" }, "Saving"));
  assert.match(pending, /disabled=""/);
  assert.match(pending, /aria-busy="true"/);
  assert.match(pending, /action-spinner/);
  assert.match(pending, /--action-accent:var\(--ds-color-danger\)/);
  assert.match(html(createElement(actions.ActionLink, { href: "/x", variant: "ghost" }, "Go")), /^<a href="\/x" class="action action-ghost action-md"/);
});

test("icon-only and toggle actions are named and expose their state", () => {
  const icon = html(createElement(actions.IconButton, { icon: "search", label: "Search", pressed: true }));
  assert.match(icon, /aria-label="Search"/);
  assert.match(icon, /title="Search"/);
  assert.match(icon, /aria-pressed="true"/);
  const tile = html(createElement(actions.SelectableTile, { label: "Football", selected: true, onSelect: () => {} } as ComponentProps<typeof actions.SelectableTile>, "⚽"));
  assert.match(tile, /role="radio"/);
  assert.match(tile, /aria-checked="true"/);
  assert.match(tile, /selectable-tile-seal/);
});

test("hero, fuse and stepper actions clamp and label their values", () => {
  const hero = html(createElement(actions.HeroCta, { label: "PLAY MATCH", helper: "Squad ready", disabled: true }));
  assert.match(hero, /disabled=""/);
  assert.doesNotMatch(hero, /is-glow/, "a disabled hero CTA does not glow");
  assert.match(html(createElement(actions.FuseCta, { label: "SAVE", fuse: 1.4 })), /aria-valuenow="100"/);
  const stepper = html(createElement(actions.Stepper, { label: "Stake", value: 5, min: 5, max: 100, step: 5, onChange: () => {} }));
  assert.match(stepper, /aria-label="Lower stake by 5" disabled=""/);
  assert.doesNotMatch(stepper, /aria-label="Raise stake by 5" disabled/);
  const dialog = html(createElement(actions.DialogActions, { confirmLabel: "Delete", destructive: true, onConfirm: () => {}, onCancel: () => {} }));
  assert.match(dialog, /--action-accent:var\(--ds-color-danger\)/);
});

test("elements report their values accessibly", () => {
  assert.match(html(createElement(elements.Progress, { label: "Win", value: 0.625 })), /aria-valuenow="63"/);
  const steps = html(createElement(elements.StepMeter, { label: "Setup", total: 4, active: 9 }));
  assert.match(steps, /aria-valuetext="Step 4 of 4"/);
  assert.equal(steps.match(/is-passed/g)?.length, 3);
  assert.match(html(createElement(elements.DeltaChip, { delta: -3, suffix: "WEEK" })), /is-down">▼3 WEEK/);
  const tabs = html(createElement(elements.UnderlineTabs, { label: "Sections", tabs: ["A", "B"], active: 1, onChange: () => {} }));
  assert.match(tabs, /role="tablist" aria-label="Sections"/);
  assert.match(tabs, /aria-selected="true" tabindex="0">B/);
});

// Proof for Phase 1 - Part 1: AIRDeck understands what a valid deck looks like.
// Pure unit tests — no server, no database, no AI.
//   npm run test:deck
import test from "node:test";
import assert from "node:assert/strict";
import { validateDeck, DECK_VERSION, MAX_SLIDES, MAX_PROP_LENGTH } from "../deck/schema.js";

const validDeck = () => ({
  version: DECK_VERSION,
  theme: "netflix",
  slides: [
    {
      component: "Hero",
      props: { title: "AIRDeck", subtitle: "Presentations as code" },
    },
  ],
});

// ── Valid decks ─────────────────────────────────────────────────────

test("a well-formed deck is valid with no errors", () => {
  const result = validateDeck(validDeck());
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("multiple slides and optional props are valid", () => {
  const deck = validDeck();
  deck.slides.push({ component: "Hero", props: { title: "Second" } });
  assert.equal(validateDeck(deck).valid, true);
});

// ── Top-level shape ─────────────────────────────────────────────────

test("non-object sources are rejected", () => {
  for (const bad of [null, undefined, "deck", 42, []]) {
    const result = validateDeck(bad);
    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, ["Deck source must be a JSON object."]);
  }
});

test("missing version is reported", () => {
  const deck = validDeck();
  delete deck.version;
  const result = validateDeck(deck);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Missing version"));
});

test("wrong version is reported", () => {
  const deck = validDeck();
  deck.version = 2;
  const result = validateDeck(deck);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes(`Unsupported version: expected ${DECK_VERSION}`));
});

test("missing or empty theme is reported", () => {
  const noTheme = validDeck();
  delete noTheme.theme;
  assert.ok(validateDeck(noTheme).errors.includes("Missing theme"));

  const emptyTheme = validDeck();
  emptyTheme.theme = "   ";
  assert.ok(validateDeck(emptyTheme).errors.includes("Theme must be a non-empty string"));
});

// ── Slides ──────────────────────────────────────────────────────────

test("slides must exist, be an array, and be non-empty", () => {
  const missing = validDeck();
  delete missing.slides;
  assert.ok(validateDeck(missing).errors.includes("Missing slides"));

  const notArray = validDeck();
  notArray.slides = {};
  assert.ok(validateDeck(notArray).errors.includes("Slides must be an array"));

  const empty = validDeck();
  empty.slides = [];
  assert.ok(validateDeck(empty).errors.includes("Slides must contain at least one slide"));
});

test("too many slides is rejected", () => {
  const deck = validDeck();
  deck.slides = Array.from({ length: MAX_SLIDES + 1 }, () => ({
    component: "Hero",
    props: { title: "x" },
  }));
  assert.ok(
    validateDeck(deck).errors.includes(`Slides must contain at most ${MAX_SLIDES} slides`)
  );
});

test("slide errors are indexed and specific", () => {
  const deck = validDeck();
  deck.slides = [
    { component: "Hero", props: { title: "fine" } },
    { props: { title: "no component" } },
    { component: "", props: {} },
    { component: "Hero" },
    "not an object",
  ];
  const { valid, errors } = validateDeck(deck);
  assert.equal(valid, false);
  assert.ok(errors.includes("Slide 2: missing component"));
  assert.ok(errors.includes("Slide 3: component must be a non-empty string"));
  assert.ok(errors.includes("Slide 4: missing props"));
  assert.ok(errors.includes("Slide 5: must be an object"));
});

test("prop values must be strings within the size bound", () => {
  const numberProp = validDeck();
  numberProp.slides[0].props.title = 42;
  assert.ok(
    validateDeck(numberProp).errors.includes('Slide 1: prop "title" must be a string')
  );

  const hugeProp = validDeck();
  hugeProp.slides[0].props.title = "x".repeat(MAX_PROP_LENGTH + 1);
  assert.ok(
    validateDeck(hugeProp).errors.includes(
      `Slide 1: prop "title" exceeds ${MAX_PROP_LENGTH} characters`
    )
  );
});

test("multiple problems are all reported at once", () => {
  const result = validateDeck({ theme: 7, slides: "nope" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3); // version, theme, slides
});

// Proof for Phase 1 - Part 2: Deck JSON → Compiler → Standalone HTML.
// Pure unit tests — no server, no database, no AI.
//   npm run test:deck
import test from "node:test";
import assert from "node:assert/strict";
import { compileDeck } from "../deck/compile.js";
import hero from "../deck/components/hero.js";
import netflix from "../deck/themes/netflix.js";

const validDeck = () => ({
  version: 1,
  theme: "netflix",
  slides: [
    {
      component: "Hero",
      props: { title: "Future of AI", subtitle: "The next generation" },
    },
  ],
});

// ── The pipeline works ──────────────────────────────────────────────

test("a valid deck compiles to one standalone HTML document", () => {
  const result = compileDeck(validDeck());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.slides.length, 1);

  const html = result.slides[0];
  assert.ok(html.startsWith("<!DOCTYPE html>"), "must start with doctype");
  assert.match(html, /<\/html>\s*$/, "must be a complete document");
  assert.ok(html.includes("<h1>Future of AI</h1>"), "title rendered");
  assert.ok(html.includes("<p>The next generation</p>"), "subtitle rendered");
});

test("the 1920x1080 slide contract is honored", () => {
  const html = compileDeck(validDeck()).slides[0];
  assert.ok(html.includes("width: 1920px"));
  assert.ok(html.includes("height: 1080px"));
  assert.ok(html.includes("overflow: hidden"));
});

test("every slide compiles independently", () => {
  const deck = validDeck();
  deck.slides.push({ component: "hero", props: { title: "Second slide" } });
  const result = compileDeck(deck);
  assert.equal(result.slides.length, 2);
  assert.ok(result.slides[0].includes("Future of AI"));
  assert.ok(!result.slides[0].includes("Second slide"));
  assert.ok(result.slides[1].includes("Second slide"));
  assert.ok(!result.slides[1].includes("Future of AI"));
});

test("subtitle is optional", () => {
  const deck = validDeck();
  deck.slides[0].props = { title: "Alone" };
  const html = compileDeck(deck).slides[0];
  assert.ok(html.includes("<h1>Alone</h1>"));
  assert.ok(!html.includes("<p>"), "no subtitle paragraph when absent");
});

test("unknown props are ignored for now", () => {
  const deck = validDeck();
  deck.slides[0].props.footnote = "should not appear";
  const html = compileDeck(deck).slides[0];
  assert.ok(!html.includes("should not appear"));
});

test("component name matching is case-insensitive", () => {
  for (const name of ["hero", "Hero", "HERO"]) {
    const deck = validDeck();
    deck.slides[0].component = name;
    assert.equal(compileDeck(deck).valid, true, `component "${name}" should compile`);
  }
});

// ── Safety ──────────────────────────────────────────────────────────

test("prop values are HTML-escaped", () => {
  const deck = validDeck();
  deck.slides[0].props.title = '<script>alert("x")</script>';
  const html = compileDeck(deck).slides[0];
  assert.ok(html.includes("&lt;script&gt;"), "markup must be escaped");
  assert.ok(!html.includes('<script>alert'), "raw markup must never pass through");
});

// ── Structured errors ───────────────────────────────────────────────

test("an invalid deck returns the schema's structured errors", () => {
  const result = compileDeck({ theme: "netflix", slides: [] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.slides, []);
  assert.ok(result.errors.includes("Missing version"));
  assert.ok(result.errors.includes("Slides must contain at least one slide"));
});

test("unknown components return structured compiler errors", () => {
  const deck = validDeck();
  deck.slides.push({ component: "Timeline", props: { title: "x" } });
  const result = compileDeck(deck);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['Slide 2: unknown component "Timeline"']);
  assert.deepEqual(result.slides, [], "no partial output on error");
});

// ── Determinism ─────────────────────────────────────────────────────

test("identical input produces byte-identical output", () => {
  const a = compileDeck(validDeck());
  const b = compileDeck(validDeck());
  assert.deepEqual(a, b);
  assert.equal(a.slides[0], b.slides[0]);
});

// ── Part 3: the real Hero component ─────────────────────────────────

test("hero renders its structure and CSS into the document", () => {
  const html = compileDeck(validDeck()).slides[0];
  assert.ok(html.includes('<section class="hero">'), "hero markup present");
  assert.ok(html.includes('data-component="hero"'), "canvas annotated");
  assert.ok(html.includes(".hero h1"), "hero CSS present in head");
  assert.ok(html.includes('<div class="hero-rule">'), "accent rule present");
});

test("hero is theme-ready: colors reference --deck-* tokens with fallbacks", () => {
  const html = compileDeck(validDeck()).slides[0];
  assert.ok(html.includes("var(--deck-bg"));
  assert.ok(html.includes("var(--deck-text"));
  assert.ok(html.includes("var(--deck-accent"));
});

test("missing title fails validation with a structured error", () => {
  const deck = validDeck();
  deck.slides[0].props = { subtitle: "orphaned" };
  const result = compileDeck(deck);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['Slide 1: hero: missing required prop "title"']);
  assert.deepEqual(result.slides, []);
});

test("blank title is treated as missing", () => {
  const deck = validDeck();
  deck.slides[0].props.title = "   ";
  const result = compileDeck(deck);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Slide 1: hero: missing required prop "title"'));
});

test("no character limits: long titles compile and render", () => {
  const deck = validDeck();
  deck.slides[0].props.title = "Long ".repeat(240).trim(); // 1199 chars
  const result = compileDeck(deck);
  assert.equal(result.valid, true);
  assert.ok(result.slides[0].includes("Long Long"));
});

test("hero output escapes quotes and ampersands through the real render path", () => {
  const deck = validDeck();
  deck.slides[0].props.title = 'Tom & "Jerry"';
  const html = compileDeck(deck).slides[0];
  assert.ok(html.includes("Tom &amp; &quot;Jerry&quot;"));
  assert.ok(!html.includes('Tom & "Jerry"'));
});

test("prop errors and unknown-component errors aggregate across slides", () => {
  const deck = validDeck();
  deck.slides = [
    { component: "hero", props: {} },
    { component: "Timeline", props: { title: "x" } },
  ];
  const result = compileDeck(deck);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'Slide 1: hero: missing required prop "title"',
    'Slide 2: unknown component "Timeline"',
  ]);
});

// ── Part 4: the Netflix theme ───────────────────────────────────────

test("theme tokens are injected as a :root block before component CSS", () => {
  const html = compileDeck(validDeck()).slides[0];
  assert.ok(html.includes(":root {"), ":root block present");
  assert.ok(html.includes(`--deck-bg: ${netflix.tokens.bg};`));
  assert.ok(html.includes(`--deck-text: ${netflix.tokens.text};`));
  assert.ok(html.includes(`--deck-muted: ${netflix.tokens.muted};`));
  assert.ok(html.includes(`--deck-accent: ${netflix.tokens.accent};`));
  assert.ok(html.includes(`--deck-font-display: ${netflix.tokens.fontDisplay};`));
  assert.ok(html.includes(`--deck-font-body: ${netflix.tokens.fontBody};`));
  assert.ok(
    html.indexOf(":root {") < html.indexOf(".hero {"),
    "tokens must be defined before component CSS consumes them"
  );
});

test("hero renders differently under the theme: tokens defined AND consumed", () => {
  const html = compileDeck(validDeck()).slides[0];
  // definition (theme) and consumption (component) meet in one document
  assert.ok(html.includes(`--deck-bg: ${netflix.tokens.bg}`), "theme defines the token");
  assert.ok(html.includes("var(--deck-bg"), "hero consumes the token");
  assert.ok(html.includes("var(--deck-accent"), "hero consumes the accent");
});

test("hero source contains no theme literals — themes reach it only via variables", () => {
  for (const value of Object.values(netflix.tokens)) {
    assert.ok(
      !hero.css.includes(value),
      `hero.css must not hardcode theme value "${value}"`
    );
  }
  assert.ok(hero.css.includes("var(--deck-bg,"), "hero keeps its neutral fallbacks");
});

test("unknown theme is an immediate deck-level failure, not aggregated", () => {
  const deck = validDeck();
  deck.theme = "apple";
  // also break a slide — its error must NOT appear alongside the theme error
  deck.slides[0].props = {};
  const result = compileDeck(deck);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['Unknown theme "apple"']);
  assert.deepEqual(result.slides, []);
});

test("theme lookup is case-insensitive", () => {
  const deck = validDeck();
  deck.theme = "Netflix";
  assert.equal(compileDeck(deck).valid, true);
});

test("themed output still satisfies the standalone HTML contract", () => {
  const html = compileDeck(validDeck()).slides[0];
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.match(html, /<\/html>\s*$/);
  assert.ok(html.includes("width: 1920px"));
  assert.ok(html.includes("height: 1080px"));
  assert.ok(html.includes("overflow: hidden"));
});

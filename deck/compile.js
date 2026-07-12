// AIRDeck Compiler — turns a validated Deck Source into standalone HTML slides.
//
//   Deck JSON ──→ Compiler ──→ Component ──→ Standalone HTML
//
// Contract (frozen — parts change internals, never this):
//   compileDeck(source) → { valid: true,  errors: [],   slides: [html…] }
//                       | { valid: false, errors: […],  slides: [] }
//
// The compiler owns: the document shell, the 1920×1080 canvas element,
// prop escaping, and error aggregation. Components own their layout,
// structure and CSS. The compiler calls the same four members on any
// component — name, validateProps, css, render — and knows nothing else
// about them.
//
// Deterministic by construction: pure function of its input. No clock,
// no randomness, no environment, no I/O.
//
// Dependency-free: imports only the deck's own modules.

import { validateDeck } from "./schema.js";
import hero from "./components/hero.js";
import netflix from "./themes/netflix.js";

// Direct lookup maps — deliberately not registry systems. Resolution is
// generic: the compiler only ever looks up by the name the deck provides;
// no theme or component name appears in compiler logic.
const COMPONENTS = {
  [hero.name]: hero,
};

const THEMES = {
  [netflix.name]: netflix,
};

// Explicit, ordered token → CSS custom property mapping. Fixed order keeps
// output byte-deterministic; the explicit list documents the entire theme
// contract in one place. Themes are pure data — this translation is the
// compiler's job.
const TOKEN_VARS = [
  ["bg", "--deck-bg"],
  ["text", "--deck-text"],
  ["muted", "--deck-muted"],
  ["accent", "--deck-accent"],
  ["fontDisplay", "--deck-font-display"],
  ["fontBody", "--deck-font-body"],
];

function tokensToCss(theme) {
  const lines = TOKEN_VARS
    .filter(([key]) => theme.tokens[key] !== undefined)
    .map(([key, cssVar]) => `    ${cssVar}: ${theme.tokens[key]};`);
  return `  :root {\n${lines.join("\n")}\n  }\n`;
}

// Central escaping: AI- or user-supplied text can never inject markup.
// Components receive pre-escaped props and interpolate freely.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeProps(props) {
  const safe = {};
  for (const [key, value] of Object.entries(props)) {
    safe[key] = escapeHtml(value);
  }
  return safe;
}

function compileSlide(component, slide, themeCss) {
  const markup = component.render(escapeProps(slide.props));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AIRDeck Slide</title>
<style>
  html, body { margin: 0; padding: 0; }
  .deck-canvas {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
  }
${themeCss}${component.css}</style>
</head>
<body>
<main class="deck-canvas" data-component="${escapeHtml(component.name)}">
${markup}
</main>
</body>
</html>
`;
}

export function compileDeck(source) {
  const validation = validateDeck(source);
  if (!validation.valid) {
    return { valid: false, errors: validation.errors, slides: [] };
  }

  // An unknown theme is a deck-level failure: nothing can be styled
  // correctly, so fail immediately instead of aggregating slide errors.
  const theme = THEMES[source.theme.trim().toLowerCase()];
  if (!theme) {
    return { valid: false, errors: [`Unknown theme "${source.theme}"`], slides: [] };
  }
  const themeCss = tokensToCss(theme);

  // Resolve components and collect ALL errors before compiling anything —
  // callers get the complete picture, never partial output.
  const errors = [];
  const resolved = source.slides.map((slide, i) => {
    const component = COMPONENTS[slide.component.trim().toLowerCase()];
    if (!component) {
      errors.push(`Slide ${i + 1}: unknown component "${slide.component}"`);
      return null;
    }
    for (const problem of component.validateProps(slide.props)) {
      errors.push(`Slide ${i + 1}: ${component.name}: ${problem}`);
    }
    return component;
  });
  if (errors.length > 0) {
    return { valid: false, errors, slides: [] };
  }

  return {
    valid: true,
    errors: [],
    slides: source.slides.map((slide, i) => compileSlide(resolved[i], slide, themeCss)),
  };
}

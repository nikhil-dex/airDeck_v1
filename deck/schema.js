// AIRDeck Deck Source — the structured presentation format (version 1).
//
// A deck looks like:
//
//   {
//     version: 1,
//     theme: "netflix",
//     slides: [
//       { component: "Hero", props: { title: "...", subtitle: "..." } }
//     ]
//   }
//
// This file defines and validates the SHAPE of that language only.
// Whether a theme or component actually exists is checked by their
// registries (introduced in later parts) — the language doesn't know
// or care what's installed.
//
// validateDeck is a pure function: data in, verdict out. No exceptions,
// no side effects, no dependencies.

export const DECK_VERSION = 1;

// Matches the existing save-ppt limit so a valid deck is always saveable.
export const MAX_SLIDES = 50;

// Sanity bound per prop value; component contracts may tighten this later.
export const MAX_PROP_LENGTH = 5000;

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function validateDeck(source) {
  const errors = [];

  if (!isPlainObject(source)) {
    return { valid: false, errors: ["Deck source must be a JSON object."] };
  }

  // version
  if (source.version === undefined) {
    errors.push("Missing version");
  } else if (source.version !== DECK_VERSION) {
    errors.push(`Unsupported version: expected ${DECK_VERSION}`);
  }

  // theme
  if (source.theme === undefined) {
    errors.push("Missing theme");
  } else if (typeof source.theme !== "string" || !source.theme.trim()) {
    errors.push("Theme must be a non-empty string");
  }

  // slides
  if (source.slides === undefined) {
    errors.push("Missing slides");
  } else if (!Array.isArray(source.slides)) {
    errors.push("Slides must be an array");
  } else if (source.slides.length === 0) {
    errors.push("Slides must contain at least one slide");
  } else if (source.slides.length > MAX_SLIDES) {
    errors.push(`Slides must contain at most ${MAX_SLIDES} slides`);
  } else {
    source.slides.forEach((slide, i) => {
      const at = `Slide ${i + 1}`;

      if (!isPlainObject(slide)) {
        errors.push(`${at}: must be an object`);
        return;
      }

      // component
      if (slide.component === undefined) {
        errors.push(`${at}: missing component`);
      } else if (typeof slide.component !== "string" || !slide.component.trim()) {
        errors.push(`${at}: component must be a non-empty string`);
      }

      // props
      if (slide.props === undefined) {
        errors.push(`${at}: missing props`);
      } else if (!isPlainObject(slide.props)) {
        errors.push(`${at}: props must be an object`);
      } else {
        for (const [key, value] of Object.entries(slide.props)) {
          if (typeof value !== "string") {
            errors.push(`${at}: prop "${key}" must be a string`);
          } else if (value.length > MAX_PROP_LENGTH) {
            errors.push(`${at}: prop "${key}" exceeds ${MAX_PROP_LENGTH} characters`);
          }
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

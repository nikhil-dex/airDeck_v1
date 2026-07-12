// Netflix theme — pure data, nothing else.
//
// A theme owns presentation tokens only. No layouts, no spacing, no
// animations, no components, no logic. The compiler translates tokens
// into CSS custom properties; components consume them as var(--deck-*).
//
// Mood, not branding: cinematic, minimal, premium. Deep charcoal-black,
// warm off-white, a cinematic crimson accent — deliberately not the
// trademark red. System font stacks only: slides must stay
// self-contained, so themes may never reference external fonts.

const netflix = {
  name: "netflix",
  tokens: {
    bg: "#0a0a0c",
    text: "#f5f2ee",
    muted: "#8f8f96",
    accent: "#c9161f",
    fontDisplay: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
    fontBody: "'Helvetica Neue', 'Segoe UI', Arial, sans-serif",
  },
};

export default netflix;

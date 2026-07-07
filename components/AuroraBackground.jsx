// Fixed aurora-blob + film-grain backdrop used behind every page.
// Purely decorative: no pointer events, sits below .page-content (z-index 2).
export default function AuroraBackground() {
  return (
    <>
      <div className="aurora" aria-hidden="true">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>
      <div className="noise" aria-hidden="true" />
    </>
  );
}

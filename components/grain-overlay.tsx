/**
 * Fixed, non-interactive film-grain layer for subtle depth. Pure CSS (SVG
 * noise data-URI in `.grain`); hidden under reduced motion.
 */
export default function GrainOverlay() {
  return <div className="grain" aria-hidden="true" />;
}

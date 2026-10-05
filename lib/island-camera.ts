import type { IslandId } from "./island-map";

/** Local gameplay composition. These are camera directions, never player poses.
 * A 42-degree vertical lens has a 21-degree upper ray: the old 26-degree
 * downward pitch could not show any sky. Keep a small horizon/sky band and
 * frame the human in the foreground rather than an empty floor from above.
 * The overview's independently measured all-world fit remains unchanged.
 */
export const ISLAND_CAMERA_FOV = 42;
export const ISLAND_WALKING_SHOTS = {
  default: { direction: [5, 9, 32], halfHeight: 8.8, focus: [0, 3.2, -5] },
  // Front-left veranda view avoids the harbor roof while preserving the open
  // side of the studio. No automatic orbit or orientation changes per frame.
  about: { direction: [-10, 10, 28], halfHeight: 8.8, focus: [0, 3.2, -5] },
  // Taller machinery needs slightly more headroom, not a top-down camera.
  skills: { direction: [5, 10, 36], halfHeight: 10.5, focus: [0, 4.5, -5] },
  education: { direction: [5, 9, 32], halfHeight: 10.3, focus: [0, 4.8, -5] },
  // The sea-relative arrival is below the beacon's own footing. Frame its
  // complete 17.5m silhouette, not just the previously nominal tower height.
  // Front-left viewing also brings the tower away from the right minimap.
  contact: { direction: [-14, 9, 32], halfHeight: 13.5, focus: [0, 8, -5] },
  // Portrait needs a taller, slightly offset shot: the beacon sits below the
  // two top HUD panels while the explorer stays in the foreground. This is
  // still a stable local shot, not a camera orbit or a terrain/player change.
  // Actual R2 lantern-ring vertices need additional space below the minimap;
  // calibrate this portrait framing, leaving its lens, direction and player fixed.
  contactPortrait: { direction: [-20, 9, 36], halfHeight: 15.8, focus: [.5, 10.6, -5] },
} as const;

export function getIslandWalkingShot(area: IslandId | null, aspect: number) {
  const shot = area === "about" ? ISLAND_WALKING_SHOTS.about
    : area === "skills" ? ISLAND_WALKING_SHOTS.skills
    : area === "education" ? ISLAND_WALKING_SHOTS.education
    : area === "contact" ? aspect < .8 ? ISLAND_WALKING_SHOTS.contactPortrait : ISLAND_WALKING_SHOTS.contact
    : ISLAND_WALKING_SHOTS.default;
  return { ...shot, halfHeight: aspect < .8 && area !== "contact" ? 12.5 : shot.halfHeight };
}

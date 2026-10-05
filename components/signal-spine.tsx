import Image from "next/image";

/**
 * Reliable visual fallback for reduced-motion and unavailable WebGL. A live
 * JourneyCanvas hides this asset as soon as the real Three.js scene is ready.
 */
export default function SignalSpine() {
  return (
    <div className="signal-spine" aria-hidden="true">
      <Image
        src="/signal-to-structure-v2.png"
        alt=""
        fill
        priority
        sizes="(max-width: 767px) 92vw, (max-width: 1280px) 72vw, 920px"
        className="signal-spine__image"
      />
    </div>
  );
}

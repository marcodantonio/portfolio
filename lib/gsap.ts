/**
 * Single GSAP entry point. Plugins are registered once here; components import
 * { gsap, ScrollTrigger, SplitText } from "@/lib/gsap", never from "gsap" directly.
 * Client-only consumers — registration is window-guarded for SSR safety.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);
  // Webfonts swap in after first paint and can shift heading metrics; recompute
  // every trigger's start/end once fonts settle so cached positions stay exact.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger, SplitText, MotionPathPlugin };

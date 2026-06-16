"use client";

import { useEffect, useState } from "react";

export default function TypedText({ roles }: { roles: string[] }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    let ri = 0, ci = 0, deleting = false;
    let tid: ReturnType<typeof setTimeout>;

    function loop() {
      const cur = roles[ri];
      if (!deleting) {
        ci++;
        setDisplay(cur.slice(0, ci));
        if (ci === cur.length) {
          deleting = true;
          tid = setTimeout(loop, 2000);
          return;
        }
      } else {
        ci--;
        setDisplay(cur.slice(0, ci));
        if (ci === 0) {
          deleting = false;
          ri = (ri + 1) % roles.length;
        }
      }
      tid = setTimeout(loop, deleting ? 36 : 62);
    }

    tid = setTimeout(loop, 800);
    return () => clearTimeout(tid);
  }, [roles]);

  return (
    <span>
      {display}
      <span
        className="inline-block w-0.5 h-[1em] ml-0.5 align-middle"
        style={{ background: "var(--accent)", animation: "blinkCaret 1s step-end infinite" }}
      />
    </span>
  );
}

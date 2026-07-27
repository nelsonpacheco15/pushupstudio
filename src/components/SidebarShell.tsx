"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/** Wraps the studio sidebar: on mobile it becomes a slide-in drawer with a hamburger. */
export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]); // close on navigation

  return (
    <>
      <button className="studio-hamburger" aria-label="Menu" onClick={() => setOpen(true)}>☰</button>
      {open && <div className="studio-scrim" onClick={() => setOpen(false)} />}
      <div className={`studio-sidebar${open ? " open" : ""}`} style={{ flex: "0 0 232px" }}>
        {children}
      </div>
    </>
  );
}

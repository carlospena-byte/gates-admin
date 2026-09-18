/**
 * Tracks which of the given section ids is currently "active" while the
 * page scrolls — the last one (in `sectionIds` order) still intersecting a
 * band near the top of the viewport. Drives the highlighted state of an
 * anchor-style section nav (see UnitDetailPage's sticky nav). Returns
 * `[activeId, jumpTo]`: `jumpTo` lets a nav click mark its target active
 * immediately, instead of waiting on the scroll it triggers to settle and
 * get reported back through the observer.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// How long a jumpTo() click "wins" over the observer/scroll-driven
// recompute — long enough to cover a smooth-scroll animation settling.
const CLICK_SUPPRESS_MS = 900;

export function useScrollSpy(
  sectionIds: readonly string[],
  rootMargin = "-96px 0px -70% 0px",
): readonly [string, (id: string) => void] {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? "");
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    // IntersectionObserver only reports entries whose state *changed* since
    // the last callback — a section that entered and then just sits there
    // (taller than the observed band) never reappears in `entries` again.
    // Track each id's last-known isIntersecting flag here so recompute()
    // always sees the full observed set, not just whatever changed most
    // recently. (Just the flag, not the entry's rect — once a section is
    // intersecting, ordering by "last in page order" below doesn't need its
    // exact position, which would otherwise go stale between callbacks.)
    const intersecting = new Map<string, boolean>();
    let observer: IntersectionObserver | null = null;
    let watcher: MutationObserver | null = null;

    const recompute = () => {
      if (Date.now() < suppressUntilRef.current) return;

      // On a page short enough that its trailing sections never climb into
      // the band watched below, plain intersection would leave an earlier
      // section "active" forever once you hit the bottom — so once scrolled
      // (within rounding) to the bottom of the page, the last section wins
      // outright, intersecting or not.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveId(sectionIds[sectionIds.length - 1]);
        return;
      }

      // Sections can overlap the band simultaneously (a short one right
      // after a tall one, say); the one that's furthest along in reading
      // order is the one the user has actually scrolled to, regardless of
      // which one's edge happens to sit higher in the viewport right now.
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        if (intersecting.get(sectionIds[i])) {
          setActiveId(sectionIds[i]);
          return;
        }
      }
    };

    const attach = (elements: HTMLElement[]) => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            intersecting.set(entry.target.id, entry.isIntersecting);
          }
          recompute();
        },
        { rootMargin, threshold: 0 },
      );
      elements.forEach((el) => observer!.observe(el));
    };

    const tryAttach = () => {
      const elements = sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      if (elements.length === 0) return false;
      attach(elements);
      return true;
    };

    // The sections this watches typically mount after an async load gate
    // (e.g. the caller renders a "loading"/"not found" placeholder — with
    // none of these ids in the DOM — until its data arrives). This effect's
    // first run can land during that placeholder render, before the real
    // section ids exist; a fixed dependency array won't re-run it once they
    // do. So if nothing's found yet, watch the DOM until it appears instead
    // of silently never observing anything.
    if (!tryAttach()) {
      watcher = new MutationObserver(() => {
        if (tryAttach()) {
          watcher?.disconnect();
          watcher = null;
        }
      });
      watcher.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);

    return () => {
      observer?.disconnect();
      watcher?.disconnect();
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [sectionIds, rootMargin]);

  const jumpTo = useCallback((id: string) => {
    suppressUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
    setActiveId(id);
  }, []);

  return [activeId, jumpTo] as const;
}

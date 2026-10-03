/**
 * "Create anything from anywhere": the global + Create menu and the command
 * palette ask a page to open its creation sheet. If the page is already
 * mounted it reacts to the event; otherwise the intent is parked here and the
 * page consumes it on mount, right after the hash navigation.
 */

import { useEffect, useRef } from "react";

import { navigateTo, type RouteType } from "@/config/routes";

export type CreateIntent =
  | "unit"
  | "resident"
  | "visitor"
  | "incident"
  | "reservation"
  | "announcement"
  | "bulletin"
  | "amenity";

export const CREATE_INTENT_ROUTES: Record<CreateIntent, RouteType> = {
  unit: "units",
  resident: "residents",
  visitor: "visitors",
  incident: "incidents",
  reservation: "reservations",
  announcement: "announcements",
  bulletin: "bulletins",
  amenity: "amenities",
};

const EVENT_NAME = "gates:create-intent";
const INTENT_TTL_MS = 8000;

let pending: { kind: CreateIntent; at: number } | null = null;

export function requestCreate(kind: CreateIntent): void {
  pending = { kind, at: Date.now() };
  window.dispatchEvent(new CustomEvent<CreateIntent>(EVENT_NAME, { detail: kind }));
  // A mounted page consumes the intent synchronously above; otherwise it
  // stays parked until the target page mounts.
  if (pending && window.location.hash !== `#${CREATE_INTENT_ROUTES[kind]}`) {
    navigateTo(CREATE_INTENT_ROUTES[kind]);
  }
}

function consume(kind: CreateIntent): boolean {
  if (!pending || pending.kind !== kind) return false;
  const fresh = Date.now() - pending.at < INTENT_TTL_MS;
  pending = null;
  return fresh;
}

/** Calls `onCreate` when someone requests creation of `kind` (now or just before mount). */
export function useCreateIntent(kind: CreateIntent, onCreate: () => void): void {
  const handlerRef = useRef(onCreate);
  useEffect(() => {
    handlerRef.current = onCreate;
  });

  useEffect(() => {
    if (consume(kind)) handlerRef.current();

    const listener = (event: Event) => {
      if ((event as CustomEvent<CreateIntent>).detail === kind && consume(kind)) handlerRef.current();
    };
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, [kind]);
}

"use client";

import { useCallback, useRef } from "react";

/** Tighter pacing so streamed JSON visibly advances during live Gemini SSE. */
const COALESCE_TICK_MS = 36;
/** One-shot SSE payloads from the planner (large JSON) skip interval pacing entirely. */
const LARGE_SINGLE_CHUNK = 24_576;

/**
 * Batches SSE token payloads into coarse React updates so streamed JSON does not
 * dribble onto the screen one tiny chunk at a time — especially on slower devices.
 */
export function useBatchedStreamTokens(
  setBuffer: React.Dispatch<React.SetStateAction<string | undefined>>
) {
  const accRef = useRef("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flushAccToState = useCallback(() => {
    const chunk = accRef.current;
    accRef.current = "";
    if (!chunk) return;
    setBuffer((prev) => (prev ?? "") + chunk);
  }, [setBuffer]);

  const appendToken = useCallback(
    (token: string) => {
      accRef.current += token;

      if (
        token.length >= LARGE_SINGLE_CHUNK ||
        accRef.current.length >= LARGE_SINGLE_CHUNK
      ) {
        if (tickRef.current != null) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        flushAccToState();
        return;
      }

      if (tickRef.current == null) {
        flushAccToState();
        tickRef.current = window.setInterval(flushAccToState, COALESCE_TICK_MS);
      }
    },
    [flushAccToState]
  );

  const flushPending = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    flushAccToState();
  }, [flushAccToState]);

  const resetQueue = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    accRef.current = "";
  }, []);

  return { appendToken, flushPending, resetQueue };
}

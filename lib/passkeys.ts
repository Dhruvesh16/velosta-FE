import type { RefObject } from "react";

import { authApi, type TokenBundle } from "@/lib/api";

type CompletePasskeySignInOpts = {
  /**
   * Element hosting `autocomplete` ending with `webauthn` (SimpleWebAuthn requirement for conditional UI).
   * When provided, we try conditional mediation **first** so password managers (Proton Pass, 1Password)
   * can surface the same picker-style UI as Google sign-in.
   */
  webauthnFieldRef?: RefObject<HTMLElement | null>;
  /** Default true whenever `webauthnFieldRef` is set */
  preferConditionalUi?: boolean;
};

async function conditionalMediationSupported(): Promise<boolean> {
  const PKC = globalThis.PublicKeyCredential as
    | (typeof PublicKeyCredential & {
        isConditionalMediationAvailable?: () => Promise<boolean>;
      })
    | undefined;
  if (!PKC || typeof PKC.isConditionalMediationAvailable !== "function") return false;
  return PKC.isConditionalMediationAvailable();
}

/** After programmatic `.focus()`, give the browser + extension one frame to attach passkey handlers. */
async function settleAfterFocus(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Recoverable failures: conditional UI unavailable, user dismissed sheet, abort from SimpleWebAuthn
 * cancelling a prior ceremony — we fall back to a **modal** `get()` using the **same** challenge.
 */
function isRecoverableWebAuthnDeferral(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  if (name === "AbortError") return true;
  if (name === "NotAllowedError") return true;
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  return (
    msg.includes("conditional") ||
    msg.includes("cancelling existing webauthn") ||
    msg.includes("not allowed") ||
    msg.includes("aborted") ||
    msg.includes("user cancelled")
  );
}

/**
 * Single `/passkey/login/begin`, then assertion.
 *
 * 1. When an anchor ref is provided → try **conditional** mediation (PM-friendly).
 * 2. On benign failure → same session, **modal** assertion (Chrome system UI / security key).
 *
 * Critically: we never call `passkeyLoginBegin()` twice in one click — that invalidated Redis challenges
 * and surfaced flaky 401s from `/passkey/login/complete`.
 */
export async function completePasskeySignIn(opts?: CompletePasskeySignInOpts): Promise<TokenBundle> {
  const { startAuthentication } = await import("@simplewebauthn/browser");

  const begin = await authApi.passkeyLoginBegin();
  const sessionId = begin.sessionId;
  const options = begin.options as Record<string, unknown>;

  const finish = (credential: unknown) =>
    authApi.passkeyLoginComplete({
      session_id: sessionId,
      credential: credential as Record<string, unknown>,
    });

  const anchor = opts?.webauthnFieldRef;
  const tryConditionalUi =
    anchor != null &&
    (opts?.preferConditionalUi ?? true) &&
    (await conditionalMediationSupported());

  if (tryConditionalUi && anchor) {
    anchor.current?.focus({ preventScroll: true });
    await settleAfterFocus();
    try {
      const credential = await startAuthentication({
        optionsJSON: options as never,
        useBrowserAutofill: true,
        verifyBrowserAutofillInput: true,
      });
      return finish(credential);
    } catch (err) {
      if (!isRecoverableWebAuthnDeferral(err)) throw err;
    }
  }

  const credential = await startAuthentication({
    optionsJSON: options as never,
    useBrowserAutofill: false,
  });
  return finish(credential);
}

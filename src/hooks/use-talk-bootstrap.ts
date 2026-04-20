"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchTalkBootstrap,
  fetchTalkBootstrapViaJsonp,
  getTalkPortalAuthorizeUrl,
  getMockBootstrapPayload,
  type TalkBootstrapPayload,
  TalkPortalApiError,
} from "@/lib/talk-portal-api";

interface UseTalkBootstrapOptions {
  fallbackToMock?: boolean;
}

const HARD_TIMEOUT_MS = 15000;
const AUTO_AUTHORIZE_STORAGE_KEY = "talk-portal:auto-authorize-attempted";
const AUTO_AUTHORIZE_MAX_ATTEMPTS = 2;
const FORCE_MOCK_STORAGE_KEY = "talk-portal:force-mock-bootstrap";

async function withHardTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  timeoutError: TalkPortalApiError,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timerId = setTimeout(() => reject(timeoutError), timeoutMs);
      }),
    ]);
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

function isAutoAuthorizeCandidate(error: TalkPortalApiError) {
  return (
    error.code === "AUTH_REDIRECT" ||
    error.code === "UNAUTHENTICATED_USER" ||
    error.code === "FORBIDDEN_DOMAIN" ||
    error.code === "BOOTSTRAP_TIMEOUT" ||
    error.code === "JSONP_TIMEOUT" ||
    error.code === "JSONP_LOAD_ERROR"
  );
}

function tryAutoAuthorizeRedirect() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const rawAttemptCount = Number.parseInt(
      window.sessionStorage.getItem(AUTO_AUTHORIZE_STORAGE_KEY) ?? "0",
      10,
    );
    const attemptCount = Number.isFinite(rawAttemptCount)
      ? Math.max(0, Math.trunc(rawAttemptCount))
      : 0;

    if (attemptCount >= AUTO_AUTHORIZE_MAX_ATTEMPTS) {
      return false;
    }

    const authorizeUrl = getTalkPortalAuthorizeUrl(window.location.href);
    if (!authorizeUrl) {
      return false;
    }

    window.sessionStorage.setItem(AUTO_AUTHORIZE_STORAGE_KEY, String(attemptCount + 1));
    window.location.assign(authorizeUrl);
    return true;
  } catch {
    return false;
  }
}

function clearAutoAuthorizeFlag() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(AUTO_AUTHORIZE_STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

function isTruthyFlag(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isFalsyFlag(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off";
}

function shouldForceMockBootstrap() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const queryFlag = params.get("mock");

    if (isTruthyFlag(queryFlag)) {
      window.sessionStorage.setItem(FORCE_MOCK_STORAGE_KEY, "1");
      return true;
    }

    if (isFalsyFlag(queryFlag)) {
      window.sessionStorage.removeItem(FORCE_MOCK_STORAGE_KEY);
      return false;
    }

    return window.sessionStorage.getItem(FORCE_MOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function createHardTimeoutError(code: "BOOTSTRAP_TIMEOUT" | "JSONP_TIMEOUT") {
  if (code === "JSONP_TIMEOUT") {
    return new TalkPortalApiError(
      "JSONP timeout: Could not receive a response from Apps Script.",
      408,
      "JSONP_TIMEOUT",
    );
  }

  return new TalkPortalApiError(
    "Apps Script API request timed out. Retry after signing in with an allowed Google account.",
    408,
    "BOOTSTRAP_TIMEOUT",
  );
}

export function useTalkBootstrap(options?: UseTalkBootstrapOptions) {
  const fallbackToMock = options?.fallbackToMock ?? false;
  const [data, setData] = useState<TalkBootstrapPayload | null>(null);
  const [error, setError] = useState<TalkPortalApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const normalizeError = useCallback((caught: unknown) => {
    if (caught instanceof Error && caught.name === "AbortError") {
      return null;
    }

    if (caught instanceof Error && "code" in caught && "status" in caught) {
      return caught as TalkPortalApiError;
    }

    if (caught instanceof TypeError && caught.message.includes("Failed to fetch")) {
      return new TalkPortalApiError(
        "Browser could not reach Apps Script (possible auth redirect or CORS issue).",
        0,
        "NETWORK_ERROR",
      );
    }

    if (caught instanceof TypeError && caught.message.includes("Load failed")) {
      return new TalkPortalApiError(
        "Browser could not reach Apps Script (possible auth redirect or CORS issue).",
        0,
        "NETWORK_ERROR",
      );
    }

    return new TalkPortalApiError(String(caught), 500, "UNKNOWN_ERROR");
  }, []);

  const load = useCallback(async (signal?: AbortSignal): Promise<TalkPortalApiError | null> => {
    if (shouldForceMockBootstrap()) {
      const mockPayload = await getMockBootstrapPayload();
      setData(mockPayload);
      setError(null);
      setIsFallback(false);
      return null;
    }

    try {
      const payload = await withHardTimeout(
        fetchTalkBootstrap(signal),
        HARD_TIMEOUT_MS,
        createHardTimeoutError("BOOTSTRAP_TIMEOUT"),
      );

      clearAutoAuthorizeFlag();
      setData(payload);
      setError(null);
      setIsFallback(false);
      return null;
    } catch (caught) {
      const nextError = normalizeError(caught);
      if (!nextError) {
        return null;
      }

      let finalError = nextError;

      const shouldTryJsonp =
        nextError.code === "NETWORK_ERROR" ||
        nextError.code === "AUTH_REDIRECT" ||
        nextError.code === "INVALID_JSON" ||
        nextError.code === "BOOTSTRAP_TIMEOUT" ||
        nextError.code === "HTTP_ERROR";

      if (shouldTryJsonp) {
        try {
          const payload = await withHardTimeout(
            fetchTalkBootstrapViaJsonp(),
            HARD_TIMEOUT_MS,
            createHardTimeoutError("JSONP_TIMEOUT"),
          );

          clearAutoAuthorizeFlag();
          setData(payload);
          setError(null);
          setIsFallback(false);
          return null;
        } catch (jsonpCaught) {
          const jsonpError = normalizeError(jsonpCaught);
          if (jsonpError) {
            finalError = new TalkPortalApiError(
              `${nextError.message} / JSONP: ${jsonpError.message}`,
              jsonpError.status || nextError.status,
              jsonpError.code || nextError.code,
            );
          }
        }
      }

      if (isAutoAuthorizeCandidate(finalError) && tryAutoAuthorizeRedirect()) {
        return null;
      }

      setError(finalError);

      if (fallbackToMock) {
        const mockPayload = await getMockBootstrapPayload();
        setData(mockPayload);
        setIsFallback(true);
        return finalError;
      }

      setData(null);
      setIsFallback(false);
      return finalError;
    }
  }, [fallbackToMock, normalizeError]);

  const reload = useCallback(async () => {
    const controller = new AbortController();

    setIsLoading(true);
    const loadError = await load(controller.signal);
    setIsLoading(false);
    return loadError;
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setIsLoading(true);
      await load(controller.signal);
      setIsLoading(false);
    };

    void run();

    return () => controller.abort();
  }, [load]);

  return { data, error, isLoading, isFallback, reload };
}

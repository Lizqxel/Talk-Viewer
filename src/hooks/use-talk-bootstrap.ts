"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchTalkBootstrap,
  fetchTalkBootstrapViaJsonp,
  getMockBootstrapPayload,
  type TalkBootstrapPayload,
  TalkPortalApiError,
} from "@/lib/talk-portal-api";

interface UseTalkBootstrapOptions {
  fallbackToMock?: boolean;
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
        "ブラウザからApps Scriptへアクセスできませんでした（認証リダイレクトまたはCORSの可能性）",
        0,
        "NETWORK_ERROR",
      );
    }

    return new TalkPortalApiError(String(caught), 500, "UNKNOWN_ERROR");
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const payload = await fetchTalkBootstrap(signal);
      setData(payload);
      setError(null);
      setIsFallback(false);
    } catch (caught) {
      const nextError = normalizeError(caught);
      if (!nextError) {
        return;
      }

      const shouldTryJsonp =
        nextError.code === "NETWORK_ERROR" ||
        nextError.code === "AUTH_REDIRECT" ||
        nextError.code === "INVALID_JSON" ||
        nextError.code === "HTTP_ERROR";

      if (shouldTryJsonp) {
        try {
          const payload = await fetchTalkBootstrapViaJsonp();
          setData(payload);
          setError(null);
          setIsFallback(false);
          return;
        } catch (jsonpCaught) {
          const jsonpError = normalizeError(jsonpCaught);
          if (jsonpError) {
            setError(
              new TalkPortalApiError(
                `${nextError.message} / JSONP: ${jsonpError.message}`,
                jsonpError.status || nextError.status,
                jsonpError.code || nextError.code,
              ),
            );
          } else {
            setError(nextError);
          }
        }
      } else {
        setError(nextError);
      }

      if (fallbackToMock) {
        const mockPayload = await getMockBootstrapPayload();
        setData(mockPayload);
        setIsFallback(true);
        return;
      }

      setData(null);
      setIsFallback(false);
    }
  }, [fallbackToMock, normalizeError]);

  const reload = useCallback(async () => {
    const controller = new AbortController();

    setIsLoading(true);
    await load(controller.signal);
    setIsLoading(false);
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
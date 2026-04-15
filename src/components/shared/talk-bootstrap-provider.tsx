"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useTalkBootstrap } from "@/hooks/use-talk-bootstrap";
import { type TalkPortalApiError, type TalkBootstrapPayload } from "@/lib/talk-portal-api";

interface TalkBootstrapContextValue {
  data: TalkBootstrapPayload | null;
  error: TalkPortalApiError | null;
  isLoading: boolean;
  isFallback: boolean;
  lastLoadedAt: Date | null;
  reload: () => Promise<TalkPortalApiError | null>;
}

const TalkBootstrapContext = createContext<TalkBootstrapContextValue | null>(null);

interface TalkBootstrapProviderProps {
  children: React.ReactNode;
}

export function TalkBootstrapProvider({ children }: TalkBootstrapProviderProps) {
  const { data, error, isLoading, isFallback, reload } = useTalkBootstrap({ fallbackToMock: false });
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (data && !error && !isLoading && !lastLoadedAt) {
      setLastLoadedAt(new Date());
    }
  }, [data, error, isLoading, lastLoadedAt]);

  const reloadWithTimestamp = useCallback(async () => {
    const reloadError = await reload();

    if (!reloadError) {
      setLastLoadedAt(new Date());
    }

    return reloadError;
  }, [reload]);

  const value = useMemo<TalkBootstrapContextValue>(() => {
    return {
      data,
      error,
      isLoading,
      isFallback,
      lastLoadedAt,
      reload: reloadWithTimestamp,
    };
  }, [data, error, isFallback, isLoading, lastLoadedAt, reloadWithTimestamp]);

  return <TalkBootstrapContext.Provider value={value}>{children}</TalkBootstrapContext.Provider>;
}

export function useTalkBootstrapContext() {
  const context = useContext(TalkBootstrapContext);

  if (!context) {
    throw new Error("useTalkBootstrapContext must be used within TalkBootstrapProvider");
  }

  return context;
}

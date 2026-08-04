"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type AiSessionContextValue = {
  screenContext: string | null;
  setScreenContext: (ctx: string | null) => void;
};

const AiSessionContext = createContext<AiSessionContextValue | undefined>(undefined);

export function AiSessionProvider({ children }: { children: ReactNode }) {
  const [screenContext, setScreenContext] = useState<string | null>(null);

  return (
    <AiSessionContext.Provider
      value={{ screenContext, setScreenContext }}
    >
      {children}
    </AiSessionContext.Provider>
  );
}

export function useAiSession() {
  const ctx = useContext(AiSessionContext);
  if (!ctx) throw new Error("useAiSession must be used within AiSessionProvider");
  return ctx;
}


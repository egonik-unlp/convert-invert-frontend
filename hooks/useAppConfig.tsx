import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, AppConfig } from "@/lib/api-client";

const fallbackConfig: AppConfig = {
  judgeThreshold: 0.75,
  auth: { scheme: "api_key", header: "X-API-Key" },
};

const AppConfigContext = createContext<AppConfig>(fallbackConfig);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(fallbackConfig);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => setConfig(fallbackConfig));
  }, []);

  const value = useMemo(() => config, [config]);
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}

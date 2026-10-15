import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type AppConfig, fallbackJudge, fallbackTuning } from "@/lib/api-client";
import { data } from "@/lib/data";

const fallbackConfig: AppConfig = {
  judgeThreshold: 0.75,
  judge: fallbackJudge,
  auth: { scheme: "session", header: "Cookie" },
  tuning: fallbackTuning,
};

interface AppConfigValue extends AppConfig {
  /** Re-read /api/config. Needed after switching the judge, which changes it. */
  refresh: () => Promise<void>;
  /** Apply a config the server just returned, without a second round trip. */
  apply: (config: AppConfig) => void;
}

const AppConfigContext = createContext<AppConfigValue>({
  ...fallbackConfig,
  refresh: async () => {},
  apply: () => {},
});

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(fallbackConfig);

  const refresh = useCallback(async () => {
    try {
      setConfig(await data.getConfig());
    } catch {
      // Keep the last good config; the dashboard stays usable offline.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AppConfigValue>(
    () => ({ ...config, refresh, apply: setConfig }),
    [config, refresh],
  );
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}

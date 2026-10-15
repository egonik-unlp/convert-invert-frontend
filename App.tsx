import { AppConfigProvider } from "@/hooks/useAppConfig";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { I18nProvider, useT } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoginScreen } from "@/components/LoginScreen";
import { AppShell } from "@/components/shell/AppShell";

function AuthGate() {
  const t = useT();
  const { state, retry } = useAuth();
  switch (state.status) {
    case "loading":
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground" aria-busy="true">
          {t.boot.starting}
        </div>
      );
    case "anon":
      return <LoginScreen />;
    case "error":
      return (
        <div className="flex h-full items-center justify-center px-4">
          <div role="alert" className="flex max-w-sm flex-col items-start gap-2 text-sm">
            <p>{t.boot.unreachable}</p>
            <p className="text-muted-foreground">{t.boot.unreachableHint}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              {t.common.retry}
            </Button>
          </div>
        </div>
      );
    case "authed":
      return (
        <AppConfigProvider>
          <AppShell />
        </AppConfigProvider>
      );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <I18nProvider>
            <AuthGate />
            <Toaster />
          </I18nProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

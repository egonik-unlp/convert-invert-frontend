import React from "react";

type State = { error: Error | null };

// Renders outside the i18n provider, so it says it in both languages.
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("App render failure", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md space-y-3 text-sm">
            <p className="font-medium">Algo se rompió · Something broke</p>
            <p className="font-mono text-xs text-muted-foreground">{this.state.error.message}</p>
            <button type="button" className="underline underline-offset-2" onClick={() => window.location.reload()}>
              Recargar · Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

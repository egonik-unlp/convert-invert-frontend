import React from "react";
import { Button } from "@/components/ui/button";

type State = { error: Error | null };

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
          <div className="max-w-lg rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Dashboard failed to render</h1>
            <p className="mt-3 text-sm text-muted-foreground">{this.state.error.message}</p>
            <Button className="mt-5" onClick={() => this.setState({ error: null })}>Retry</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

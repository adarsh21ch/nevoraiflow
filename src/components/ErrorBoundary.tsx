import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="glass-card p-8 max-w-md text-center">
            <h2 className="text-lg font-heading font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">{this.state.error?.message || "An unexpected error occurred."}</p>
            <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>Reload Page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

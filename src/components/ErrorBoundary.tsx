// Global React error boundary and loading skeleton components
import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected interface error occurred.",
    };
  }

  componentDidCatch(error: Error): void {
    console.error("GapFinder UI boundary caught error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f7f5] p-6 text-center">
          <div className="gf-panel max-w-md p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#202a25]">
              Something went wrong on this screen
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#78817b]">
              Your study materials and quiz history are safely preserved. Click below to reload the workspace.
            </p>
            {this.state.errorMessage && (
              <p className="mt-2 rounded bg-stone-100 p-2 font-mono text-[11px] text-stone-600">
                {this.state.errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#244b37] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#193b2a]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const PageSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading workspace">
    <div className="h-7 w-56 rounded-lg bg-stone-200 dark:bg-stone-800" />
    <div className="h-4 w-96 rounded bg-stone-200 dark:bg-stone-800" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="h-36 rounded-xl bg-stone-200 dark:bg-stone-800" />
      <div className="h-36 rounded-xl bg-stone-200 dark:bg-stone-800" />
      <div className="h-36 rounded-xl bg-stone-200 dark:bg-stone-800" />
    </div>
    <div className="h-64 rounded-xl bg-stone-200 dark:bg-stone-800" />
  </div>
);

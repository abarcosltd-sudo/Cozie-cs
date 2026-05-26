import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button";

interface State {
  error: Error | null;
}

interface Props {
  children: ReactNode;
  /** Optional callback for telemetry — Sentry/Datadog can hook in here. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

/**
 * Top-level error boundary. Catches anything thrown during render so the
 * whole app doesn't go blank.
 *
 * Sentry integration: set VITE_SENTRY_DSN and wire the `onError` prop with
 *   import * as Sentry from "@sentry/react";
 *   <ErrorBoundary onError={(err) => Sentry.captureException(err)}>
 *
 * Not enabled today because we don't have a DSN.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught render error", error, info);
    this.props.onError?.(error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          background: "linear-gradient(180deg, #0f0e17 0%, #1a1825 100%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Something broke.</h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", maxWidth: 420 }}>
          The app hit an unexpected error. The team has been notified — you can
          try again, or head back to the home feed.
        </p>
        <code
          style={{
            display: "block",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: 12,
            borderRadius: 8,
            maxWidth: 480,
            overflowX: "auto",
            fontSize: "0.8rem",
            color: "#fca5a5",
          }}
        >
          {this.state.error.message}
        </code>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <Button variant="primary" onClick={this.reset}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/home-feed")}>
            Go home
          </Button>
        </div>
      </div>
    );
  }
}

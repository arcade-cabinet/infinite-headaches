import React from "react";
import { GameCard } from "../game/components/GameCard";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <GameCard className="max-w-lg w-full p-8 border-red-800 bg-red-950/80">
            <h1 className="game-font text-red-400 text-3xl mb-4">CRITICAL ERROR</h1>
            <p className="text-white mb-4">
              Something went wrong in the barn. Please refresh the page.
            </p>
            <div className="bg-black/50 p-4 rounded text-xs font-mono text-red-200 overflow-auto max-h-48 mb-6">
              {this.state.error?.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="game-font bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full w-full"
            >
              RELOAD GAME
            </button>
          </GameCard>
        </div>
      );
    }

    return this.props.children;
  }
}

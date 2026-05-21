import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MIDI-Link error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex items-center justify-center h-screen bg-surface-container-lowest text-on-surface">
        <div className="text-center max-w-md px-8">
          <span className="material-symbols-outlined text-5xl text-error mb-4 block">error</span>
          <h2 className="text-xl font-black tracking-tight text-error mb-3">Something went wrong</h2>
          <p className="text-xs text-on-surface-variant font-mono break-words mb-6">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              className="px-6 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-bold text-sm hover:scale-105 transition-all"
              onClick={() => this.setState({ hasError: false, error: null })}
            >Try Again</button>
            <button
              className="px-6 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/30 font-bold text-sm hover:bg-surface-container-high transition-all"
              onClick={() => window.location.reload()}
            >Reload App</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

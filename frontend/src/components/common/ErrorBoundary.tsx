import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorInfo: 'A rendering exception occurred in this view component.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log exception details internally without exposing stack traces to the user
    console.error('ErrorBoundary caught rendering exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-900/50 rounded-xl border border-slate-800 my-4 text-slate-100">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">
              {this.props.fallbackTitle || 'View Temporarily Unavailable'}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              An unexpected display issue occurred in this component. Your session remains active. Please try refreshing or retrying.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-700"
              >
                Retry View
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

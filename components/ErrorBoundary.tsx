import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Что-то пошло не так</h1>
            <p className="text-gray-400 text-sm">
              Произошла критическая ошибка в приложении. Попробуйте обновить страницу.
            </p>
            {this.state.error && (
              <pre className="p-4 bg-zinc-900 rounded-lg text-xs text-red-400 overflow-auto text-left max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-all"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ReactNode } from 'react';

/** 라우터 errorElement + 전역 크래시 방지용 최소 바운더리 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : '알 수 없는 오류' };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 32, maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>화면을 불러오지 못했습니다</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>{this.state.message}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 8, cursor: 'pointer' }}
        >
          새로고침
        </button>
      </div>
    );
  }
}

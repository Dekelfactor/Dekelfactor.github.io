import { Component, type ReactNode } from 'react';

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Keeps the editor usable if the 3D preview fails (no WebGL, lost context, bad media). */
export class PreviewBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: hasWebGL() ? null : 'This browser has WebGL turned off, so the 3D preview cannot run. Your project still saves, and Claude can still edit it.' };
  static getDerivedStateFromError(e: Error) { return { error: `The preview stopped: ${e.message.slice(0, 160)}` }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="stage preview-error" role="alert">
        <div>
          <p>{this.state.error}</p>
          <button className="btn" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      </div>
    );
  }
}

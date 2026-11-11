import { Component } from 'react';

export default class StudentAlertsBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div className="fixed right-4 top-4 z-[120] max-w-sm rounded-lg border border-destructive/50 bg-card p-3 text-sm shadow-lg">
        <p className="font-semibold">Student notices could not load.</p>
        <button className="mt-2 text-xs font-semibold text-neon-cyan" onClick={() => this.setState({ failed: false })}>Try notices again</button>
      </div>;
    }
    return this.props.children;
  }
}
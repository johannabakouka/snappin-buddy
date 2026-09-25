'use client';
import { Component } from 'react';
import { tx } from '../tx';

// Si un écran plante, on affiche un message et un bouton pour recharger,
// au lieu de laisser une page blanche ou une erreur du navigateur.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Écran en erreur :', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    const dark = this.props.theme?.dark ?? true;
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px',
        background: this.props.theme?.bg || '#0A0A0A', color: this.props.theme?.color || 'white',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '34px' }}>🙈</p>
        <p style={{ fontSize: '15px', fontWeight: '700' }}>
          {tx('This screen had a problem', 'Cet écran a rencontré un problème')}
        </p>
        <p style={{ fontSize: '13px', color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>
          {tx('The rest of the app still works. Reload to try again.', 'Le reste de l’app fonctionne. Recharge pour réessayer.')}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px', borderRadius: '24px', border: 'none',
            background: this.props.theme?.color || 'white', color: this.props.theme?.bg || '#0A0A0A',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer',
          }}
        >
          {tx('Reload', 'Recharger')}
        </button>
      </div>
    );
  }
}

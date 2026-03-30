'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Щось пішло не так');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">W</div>
          <span className="login-logo-name">Waynum</span>
        </div>

        <div>
          <div className="login-title">Ласкаво просимо</div>
          <div className="login-sub">Система обліку та управління торгівлею</div>
        </div>

        <form onSubmit={handleSubmit} className="login-form" style={{ marginTop: 24 }}>
          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Логін</label>
            <input
              className="form-control"
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? '⏳ Вхід...' : '→ Увійти до системи'}
          </button>
        </form>


      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

type Client = { id: number; name: string; phone: string | null };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: 0, name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    const r = await fetch('/api/clients?' + params);
    if (r.ok) setClients(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [search]);

  function createNew() {
    setForm({ id: 0, name: '', phone: '' });
    setMsg('');
    setShowModal(true);
  }

  function edit(c: Client) {
    setForm({ id: c.id, name: c.name, phone: c.phone || '' });
    setMsg('');
    setShowModal(true);
  }

  async function save() {
    setSaving(true); setMsg('');
    const method = form.id === 0 ? 'POST' : 'PUT';
    
    const r = await fetch('/api/clients', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    
    if (r.ok) {
      setMsg('✅ Збережено');
      load();
      setTimeout(() => { setShowModal(false); }, 1000);
    } else {
      const d = await r.json();
      setMsg('❌ ' + d.error);
    }
    setSaving(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">👥 Клієнтська база (CRM)</div>
          <div className="page-subtitle">Додавайте покупців, зберігайте контакти</div>
        </div>
        <button className="btn btn-primary" onClick={createNew}>+ Новий клієнт</button>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 20px' }}>
             <input
                className="form-control"
                style={{ maxWidth: 300 }}
                placeholder="🔍 Пошук за ім'ям або номером..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="card-body">Завантаження...</div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">Клієнтів не знайдено</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Ім'я</th><th>Телефон</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td className="text-muted font-mono">{c.id}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="font-mono">{c.phone || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => edit(c)}>✏️ Редагувати</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Редагувати клієнта' : 'Новий клієнт'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
              <div className="form-group">
                <label className="form-label">Ім'я та Прізвище *</label>
                <input className="form-control" placeholder="Іван Іванов" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Номер телефону</label>
                <input className="form-control" placeholder="+380991234567" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Скасувати</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

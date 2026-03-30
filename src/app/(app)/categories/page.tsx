'use client';
import { useEffect, useState } from 'react';

type Category = { id: number; name: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRequiresImei, setFormRequiresImei] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/categories');
    if (r.ok) setCategories(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function createNew() {
    setFormName('');
    setFormRequiresImei(false);
    setMsg('');
    setShowModal(true);
  }

  async function save() {
    setSaving(true);
    setMsg('');
    const r = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, requiresImei: formRequiresImei }),
    });
    if (r.ok) {
      setMsg('Додано');
      load();
      setTimeout(() => { setShowModal(false); setMsg(''); }, 1000);
    } else {
      const d = await r.json();
      setMsg('Помилка: ' + d.error);
    }
    setSaving(false);
  }

  async function removeCategory(id: number) {
    if (!confirm('Видалити цю категорію?')) return;
    const r = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      load();
    } else {
      const d = await r.json();
      alert('Помилка: ' + d.error);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Категорії товарів</div>
          <div className="page-subtitle">Додавайте та видаляйте категорії (Телефони, Чохли, тощо)</div>
        </div>
        <button className="btn btn-primary" onClick={createNew}>+ Нова категорія</button>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: 600 }}>
          {loading ? (
             <div className="card-body">Завантаження...</div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Категорій ще немає</div>
            </div>
          ) : (
            <div className="recent-list">
              {categories.map(c => (
                <div key={c.id} className="recent-item">
                  <div style={{ flex: 1, fontWeight: 600 }}>{c.name}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeCategory(c.id)}>Видалити</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Нова категорія</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert ${msg.startsWith('Додано') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
              <div className="form-group">
                <label className="form-label">Назва категорії *</label>
                <input className="form-control" placeholder="Наприклад: Захисне скло" value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
              </div>
              
              <div className="form-group" style={{ marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={formRequiresImei} onChange={e => setFormRequiresImei(e.target.checked)} style={{ width: 18, height: 18 }} />
                  Товари цієї категорії мають серійні номери (IMEI)
                </label>
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                  Якщо ввімкнено, то всі нові товари в цій категорії за замовчуванням вимагатимуть IMEI.
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Скасувати</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !formName}>Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

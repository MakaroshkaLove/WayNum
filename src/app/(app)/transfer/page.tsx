'use client';
import { useEffect, useState } from 'react';

type Item = {
  id: number; imei: string;
  product: { name: string; brand: string };
  location: { id: number; name: string } | null;
};
type Location = { id: number; name: string; type: string };

export default function TransferPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(setLocations);
  }, []);

  useEffect(() => {
    if (!from) { setItems([]); return; }
    fetch(`/api/items?locationId=${from}&status=IN_STOCK`)
      .then(r => r.json()).then(setItems);
    setSelected([]);
  }, [from]);

  function toggle(id: number) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleAll() {
    setSelected(s => s.length === items.length ? [] : items.map(i => i.id));
  }

  async function transfer() {
    setError(''); setResult('');
    if (!from || !to || selected.length === 0) {
      setError('Оберіть звідки, куди та виберіть товари');
      return;
    }
    if (from === to) { setError('Точки відправки та призначення однакові'); return; }
    setLoading(true);
    const r = await fetch('/api/items/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromLocationId: from, toLocationId: to, itemIds: selected }),
    });
    const data = await r.json();
    setLoading(false);
    if (r.ok) {
      setResult(`✅ Переміщено ${data.transferred} одиниць`);
      setSelected([]);
      fetch(`/api/items?locationId=${from}&status=IN_STOCK`).then(r => r.json()).then(setItems);
    } else {
      setError(data.error || 'Помилка');
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">🔄 Переміщення товару</div>
          <div className="page-subtitle">Перемістіть телефони між складом та магазинами</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label">Звідки *</label>
                <select className="form-control" value={from} onChange={e => setFrom(e.target.value)}>
                  <option value="">Оберіть точку відправки...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 2, fontSize: 24, color: 'var(--accent)' }}>→</div>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label">Куди *</label>
                <select className="form-control" value={to} onChange={e => setTo(e.target.value)}>
                  <option value="">Оберіть точку призначення...</option>
                  {locations.filter(l => String(l.id) !== from).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={transfer}
                disabled={loading || selected.length === 0}
              >
                {loading ? '⏳...' : `→ Перемістити (${selected.length})`}
              </button>
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
            {result && <div className="alert alert-success" style={{ marginTop: 12 }}>{result}</div>}
          </div>
        </div>

        {from && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Доступні товари для переміщення</span>
              <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
                {selected.length === items.length ? 'Зняти все' : 'Вибрати все'}
              </button>
            </div>
            {items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-text">Немає товарів на цій точці</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>IMEI</th><th>Модель</th><th>Бренд</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} onClick={() => toggle(item.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                        </td>
                        <td className="font-mono" style={{ fontSize: 12 }}>{item.imei}</td>
                        <td style={{ fontWeight: 600 }}>{item.product.name}</td>
                        <td><span className="badge badge-blue">{item.product.brand}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

'use client';
import { useEffect, useState } from 'react';

type Item = {
  id: number;
  imei: string | null;
  status: string;
  quantity: number;
  product: { name: string; brand: string; price: number };
  location: { name: string; type: string };
  supplier?: { id: number; name: string } | null;
  purchasePrice: number;
};
type Location = { id: number; name: string; type: string };

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('IN_STOCK');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterLocation) params.set('locationId', filterLocation);
    if (filterStatus) params.set('status', filterStatus);
    const r = await fetch('/api/items?' + params);
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(setLocations);
  }, []);

  useEffect(() => { load(); }, [filterLocation, filterStatus]);

  const filtered = items.filter(i =>
    !search || 
    (i.imei && i.imei.includes(search)) || 
    i.product.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.supplier && i.supplier.name.toLowerCase().includes(search.toLowerCase()))
  );

  function exportCSV() {
    const rows = [['ID', 'Бренд', 'Назва', 'IMEI', 'Отримувач (Точка)', 'Постачальник', 'Статус', 'К-ть', 'Собівартість', 'Роздріб']];
    filtered.forEach(i => {
      rows.push([
        String(i.id), i.product.brand || '—', i.product.name, i.imei || '—',
        i.location?.name || '—', i.supplier?.name || '—', i.status, String(i.quantity || 1),
        String(i.purchasePrice), String(i.product.price)
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  const statusMap: Record<string, { label: string; cls: string }> = {
    IN_STOCK: { label: 'На залишку', cls: 'badge-green' },
    SOLD: { label: 'Продано', cls: 'badge-red' },
    IN_TRANSIT: { label: 'В дорозі', cls: 'badge-yellow' },
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Залишки товарів</div>
          <div className="page-subtitle">Всі телефони по точках</div>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>Експорт (CSV)</button>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="form-control"
                style={{ maxWidth: 280 }}
                placeholder="Пошук по назві, IMEI або постачальнику..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="form-control" style={{ maxWidth: 180 }} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                <option value="">Всі точки</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <select className="form-control" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Будь-який статус</option>
                <option value="IN_STOCK">На залишку</option>
                <option value="SOLD">Продано</option>
              </select>
              <span className="badge badge-purple">{filtered.length} позицій</span>
            </div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><div>Завантаження...</div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Нічого не знайдено</div>
              <div className="empty-state-sub">Спробуйте змінити фільтри або прийміть товар</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>IMEI</th><th>Модель</th><th>Постачальник</th><th>К-ть</th><th>Точка</th>
                    <th>Собівартість</th><th>Ціна продажу</th><th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const s = statusMap[item.status] || { label: item.status, cls: 'badge-blue' };
                    return (
                      <tr key={item.id}>
                        <td className="font-mono" style={{ fontSize: 12 }}>{item.imei}</td>
                        <td style={{ fontWeight: 600 }}>
                          {item.product.name}
                          {item.product.brand && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.product.brand}</div>}
                        </td>
                        <td>{item.supplier ? <span className="badge badge-yellow">{item.supplier.name}</span> : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{item.quantity} шт.</td>
                        <td>{item.location?.name || '—'}</td>
                        <td className="text-muted">{item.purchasePrice > 0 ? item.purchasePrice.toLocaleString() + ' ₴' : '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {item.product.price > 0 ? item.product.price.toLocaleString() + ' ₴' : '—'}
                        </td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

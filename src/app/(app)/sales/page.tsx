'use client';
import { useEffect, useState } from 'react';

type SaleTransaction = {
  id: number;
  createdAt: string;
  type: string;
  sourceLocation: { name: string };
  client?: { name: string; phone: string | null };
  items: {
    price: number;
    quantity: number;
    item: {
      imei: string | null;
      purchasePrice: number;
      product: { name: string; brand: string };
    };
  }[];
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);


  const [filterDate, setFilterDate] = useState('');
  const [locFilter, setLocFilter] = useState('');

  async function loadLocations() {
    const r = await fetch('/api/locations');
    if (r.ok) setLocations(await r.json());
  }

  async function loadData() {
    setLoading(true);
    let url = '/api/sales?';
    if (filterDate) url += `date=${filterDate}&`;
    if (locFilter) url += `locationId=${locFilter}&`;

    const r = await fetch(url);
    if (r.ok) {
      const data = await r.json();
      setSales(data.transactions);
      setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }

  useEffect(() => { loadLocations(); }, []);
  useEffect(() => { loadData(); }, [filterDate, locFilter]);

  async function cancelSale(id: number) {
    if (!confirm('Дійсно скасувати цей продаж та повернути товари на залишок?')) return;
    const r = await fetch('/api/sales/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id }),
    });
    if (r.ok) {
      loadData();
    } else {
      const d = await r.json();
      alert('Помилка: ' + d.error);
    }
  }

  function exportCSV() {
    const rows = [['Номер Чеку', 'Дата', 'Точка', 'Продавець', 'Клієнт', 'Тип', 'Товар', 'К-ть', 'Ціна']];
    if (isAdmin) {
      rows[0].push('Собівартість', 'Прибуток');
    }

    sales.forEach(sale => {
      sale.items.forEach(i => {
        const clientStr = sale.client ? `${sale.client.name}` : '';
        const prodName = `${i.item.product.brand ? i.item.product.brand + ' ' : ''}${i.item.product.name} ${i.item.imei || ''}`;

        const baseRow = [
          String(sale.id),
          new Date(sale.createdAt).toLocaleString('uk-UA'),
          sale.sourceLocation?.name || 'Система',
          (sale as any).user?.username || '—',
          clientStr,
          sale.type === 'RETURN' ? 'Повернення' : 'Продаж',
          prodName,
          String(i.quantity),
          String(i.price)
        ];

        if (isAdmin) {
          const profit = (i.price - i.item.purchasePrice) * i.quantity;
          baseRow.push(String(i.item.purchasePrice), String(profit));
        }

        rows.push(baseRow);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `sales_${filterDate || 'all'}.csv`;
    link.click();
  }


  const validSales = sales.filter(s => s.type === 'SALE');
  const returns = sales.filter(s => s.type === 'RETURN');
  const totalRevenue = validSales.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + (i.price * i.quantity), 0), 0);
  const totalProfit = validSales.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + ((i.price - i.item.purchasePrice) * i.quantity), 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Історія Продажів</div>
          <div className="page-subtitle">Всі транзакції та звіти по чекам</div>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>Експорт (CSV)</button>
      </div>

      <div className="page-body">

        {/* Filters */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 16, alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label text-muted">Дата</label>
              <input type="date" className="form-control" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            {isAdmin && (
              <div className="form-group">
                <label className="form-label text-muted">Точка продажу</label>
                <select className="form-control" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
                  <option value="">Усі магазини</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary w-full" onClick={() => { setFilterDate(''); setLocFilter(''); }}>
                Скинути фільтри
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-title">Успішних Продажів</div>
            <div className="stat-value">{validSales.length} шт</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Повернень</div>
            <div className="stat-value text-muted">{returns.length} шт</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Обіг (Виручка)</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{totalRevenue.toLocaleString()} ₴</div>
          </div>
          {isAdmin && (
            <div className="stat-card">
              <div className="stat-title">Чистий Прибуток (Маржа)</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalProfit.toLocaleString()} ₴</div>
            </div>
          )}
        </div>

        <div className="card">
          {loading ? (
            <div className="card-body">Завантаження...</div>
          ) : sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">-</div>
              <div className="empty-state-text">Не знайдено жодного чеку за вибраних умов</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Чек #</th>
                    <th>Дата та час</th>
                    <th>Точка</th>
                    <th>Продавець</th>
                    <th>Клієнт</th>
                    <th>Товари</th>
                    <th>Сума (₴)</th>
                    {isAdmin && <th>Прибуток (₴)</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => {
                    const total = s.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                    const profit = s.items.reduce((sum, i) => sum + ((i.price - i.item.purchasePrice) * i.quantity), 0);
                    return (
                      <tr key={s.id} style={{ opacity: s.type === 'RETURN' ? 0.5 : 1 }}>
                        <td className="font-mono text-muted">#{s.id}</td>
                        <td style={{ fontSize: 13 }}>{new Date(s.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td><span className="badge badge-blue">{s.sourceLocation?.name || 'Система'}</span></td>
                        <td>{(s as any).user?.username ? <span className="badge badge-purple">{(s as any).user.username}</span> : '—'}</td>
                        <td>{s.client?.name || '—'}</td>
                        <td style={{ fontSize: 13 }}>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {s.items.map((i, idx) => (
                              <li key={idx}>
                                {i.item.product.name} {i.item.imei ? `(${i.item.imei})` : `x${i.quantity}`} — {i.price} ₴
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td style={{ fontWeight: 800, color: s.type === 'RETURN' ? 'var(--text-muted)' : 'var(--green)' }}>
                          {total.toLocaleString()}
                        </td>
                        {isAdmin && (
                          <td style={{ fontWeight: 700, color: s.type === 'RETURN' ? 'var(--text-muted)' : 'var(--accent)' }}>
                            {profit.toLocaleString()}
                          </td>
                        )}
                        <td style={{ textAlign: 'right' }}>
                          {s.type !== 'RETURN' ? (
                            <button className="btn btn-danger btn-sm" onClick={() => cancelSale(s.id)}>Скасувати</button>
                          ) : (
                            <span className="badge badge-yellow">Повернуто</span>
                          )}
                        </td>
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

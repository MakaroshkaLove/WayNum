'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Category = { id: number; name: string; requiresImei: boolean };
type Product = { id: number; name: string; brand: string | null; sku: string | null; price: number; categoryId: number | null; category: Category | null; requiresImei: boolean; stockCount?: number; };
type Location = { id: number; name: string; type: string };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: 0, name: '', brand: '', sku: '', price: '', categoryId: '', requiresImei: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    const pUrl = filterLocation ? `/api/products?locationId=${filterLocation}` : '/api/products';
    const [pRes, cRes, lRes] = await Promise.all([
      fetch(pUrl),
      fetch('/api/categories'),
      fetch('/api/locations')
    ]);
    if (pRes.ok) setProducts(await pRes.json());
    if (cRes.ok) setCategories(await cRes.json());
    if (lRes.ok) setLocations(await lRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterLocation]);

  function edit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      sku: p.sku || '',
      price: String(p.price),
      categoryId: p.categoryId ? String(p.categoryId) : '',
      requiresImei: p.requiresImei
    });
    setMsg('');
    setShowModal(true);
  }

  function createNew() {
    setForm({ id: 0, name: '', brand: '', sku: '', price: '', categoryId: '', requiresImei: true });
    setMsg('');
    setShowModal(true);
  }

  async function save() {
    setSaving(true); setMsg('');
    const method = form.id === 0 ? 'POST' : 'PUT';


    const r = await fetch('/api/products', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (r.ok) {
      setMsg('Збережено');
      load();
      setTimeout(() => { setShowModal(false); }, 1000);
    } else {
      const d = await r.json();
      setMsg('Помилка: ' + d.error);
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm('Видалити цей товар з бази?')) return;
    const r = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      load();
    } else {
      const d = await r.json();
      alert('Помилка: ' + d.error);
    }
  }

  const [filterCategory, setFilterCategory] = useState('');

  const filteredProducts = products.filter(p => {
    const matchCat = filterCategory ? p.categoryId === Number(filterCategory) : true;
    const matchSearch = searchQuery
      ? (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())))
      : true;
    return matchCat && matchSearch;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Довідник товарів</div>
          <div className="page-subtitle">Всі ваші моделі телефонів та аксесуари</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/categories" className="btn btn-secondary">Категорії</Link>
          <button className="btn btn-primary" onClick={createNew}>+ Новий товар</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Пошук:</span>
            <input
              className="form-control"
              placeholder="Пошук за назвою або артикулом..."
              style={{ maxWidth: 300, padding: '6px 10px', minHeight: 0 }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Фільтр:</span>
            <select className="form-control" style={{ maxWidth: 200, padding: '6px 10px', minHeight: 0 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Усі категорії</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-control" style={{ maxWidth: 300, padding: '6px 10px', minHeight: 0 }} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
              <option value="">Всі точки (Загальний залишок)</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><div>Завантаження...</div></div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">В цій категорії/точці товарів немає</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Назва</th><th>Категорія</th><th>Бренд</th><th>Артикул</th><th>Тип обліку</th><th>Ціна</th><th>В наявності</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td className="text-muted font-mono">{p.id}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.category ? <span className="badge badge-purple">{p.category.name}</span> : '—'}</td>
                      <td>{p.brand ? <span className="badge badge-blue">{p.brand}</span> : '—'}</td>
                      <td className="font-mono text-muted">{p.sku || '—'}</td>
                      <td>{p.requiresImei ? <span className="badge badge-yellow">По IMEI</span> : <span className="badge badge-green">Кількісний</span>}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.price > 0 ? `${p.price.toLocaleString()} ₴` : '—'}</td>
                      <td>
                        <b style={{ color: p.stockCount && p.stockCount > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                          {p.stockCount || 0} шт.
                        </b>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => edit(p)}>Ред.</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)} style={{ marginLeft: 6 }}>✕</button>
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
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Редагувати товар' : 'Новий товар'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert ${msg.startsWith('Збережено') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Назва товару *</label>
                  <input className="form-control" placeholder="iPhone 15 / Чохол Silicone" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Категорія</label>
                  <select
                    className="form-control"
                    value={form.categoryId}
                    onChange={e => {
                      const cid = e.target.value;
                      const cat = categories.find(c => c.id === Number(cid));
                      setForm({
                        ...form,
                        categoryId: cid,
                        requiresImei: cat ? cat.requiresImei : form.requiresImei
                      });
                    }}
                  >
                    <option value="">Без категорії</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Бренд</label>
                  <input className="form-control" placeholder="Apple, Samsung, NoName" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ціна продажу (₴)</label>
                  <input className="form-control" type="number" placeholder="25000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 10 }}>
                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.requiresImei} onChange={e => setForm({ ...form, requiresImei: e.target.checked })} style={{ width: 18, height: 18 }} />
                    Облік за серійним номером (IMEI)
                  </label>
                  <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                    Зніміть прапорець для дрібних товарів (чохли, кабелі), облік яких ведеться просто в штуках. Системний артикул буде згенеровано автоматично.
                  </div>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Скасувати</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

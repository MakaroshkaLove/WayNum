'use client';
import { useEffect, useState } from 'react';

type Category = { id: number; name: string };
type Product = { id: number; name: string; brand: string; categoryId: number | null; requiresImei: boolean };
type Location = { id: number; name: string; type: string };
type Supplier = { id: number; name: string };

export default function ReceivePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [form, setForm] = useState({
    categoryId: '',
    productId: '',
    locationId: '',
    supplierId: '',
    purchasePrice: '',
    imeis: '',
    quantity: '1',
  });
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  async function loadData() {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json())
    ]).then(([p, c, l, s]) => {
      setProducts(p);
      setCategories(c);
      setLocations(l);
      setSuppliers(s);
    });
  }

  useEffect(() => { loadData(); }, []);

  const imeiList = form.imeis
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const filteredProducts = form.categoryId
    ? products.filter(p => p.categoryId === Number(form.categoryId))
    : products;

  const selectedProduct = products.find(p => p.id === Number(form.productId));
  const isAccessory = selectedProduct && !selectedProduct.requiresImei;

  async function submit() {
    setError(''); setResult(null);
    if (!form.productId || !form.locationId) {
      setError('Оберіть товар та точку');
      return;
    }
    if (isAccessory && Number(form.quantity) <= 0) {
      setError('Вкажіть кількість більшу за 0');
      return;
    }
    if (!isAccessory && imeiList.length === 0) {
      setError('Введіть хоча б один IMEI');
      return;
    }

    setLoading(true);
    const r = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: form.productId,
        locationId: form.locationId,
        supplierId: form.supplierId,
        purchasePrice: form.purchasePrice,
        imeis: imeiList,
        quantity: form.quantity
      }),
    });
    const data = await r.json();
    setLoading(false);
    if (r.ok) {
      setResult(data);
      setForm({ ...form, imeis: '', quantity: '1', productId: '' });
    } else {
      setError(data.error || 'Помилка');
    }
  }

  async function createSupplier() {
    if (!newSupplierName) return;
    const r = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSupplierName }),
    });
    if (r.ok) {
      const created = await r.json();
      setSuppliers([...suppliers, created]);
      setForm({ ...form, supplierId: String(created.id) });
      setShowSupplierModal(false);
      setNewSupplierName('');
    } else {
      alert('Помилка створення постачальника');
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Прийом товару</div>
          <div className="page-subtitle">Додавання позицій до віртуального складу</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="card-header"><span className="card-title">Параметри партії</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div className="alert alert-error">{error}</div>}
            {result && (
              <div className="alert alert-success">
                Оприбутковано {result.created} одиниць товару!
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Постачальник</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-control" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                    <option value="">Без постачальника</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button className="btn btn-secondary" onClick={() => setShowSupplierModal(true)}>+</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Точка призначення *</label>
                <select className="form-control" value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                  <option value="">Оберіть точку...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type === 'WAREHOUSE' ? 'Склад' : 'Магазин'})</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Категорія товару</label>
                <select className="form-control" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value, productId: '' })}>
                  <option value="">Усі категорії</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Модель товару *</label>
                <select className="form-control" value={form.productId} disabled={filteredProducts.length === 0} onChange={e => setForm({ ...form, productId: e.target.value })}>
                  <option value="">{filteredProducts.length === 0 ? 'Немає товарів в категорії' : 'Оберіть модель...'}</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.brand ? p.brand + ' ' : ''}{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Собівартість за одиницю (₴)</label>
                <input
                  className="form-control"
                  type="number"
                  placeholder="0"
                  value={form.purchasePrice}
                  onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
                />
              </div>
              <div className="form-group"></div>
            </div>

            {selectedProduct && (
              <div style={{ marginTop: 10, padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ marginBottom: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isAccessory ? 'Кількість на прийом (шт.)' : 'Серійні номери (IMEI)'}
                </div>

                {isAccessory ? (
                  <div>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })}
                      style={{ fontSize: 24, padding: 16, fontWeight: 700, color: 'var(--accent)', maxWidth: 200 }}
                    />
                    <p className="text-sm text-muted" style={{ marginTop: 10 }}>
                      Цей товар не потребує обліку за IMEI. Просто вкажіть кількість одиниць для прийому.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted" style={{ marginBottom: 10 }}>
                      Введіть кожен IMEI з нового рядка або скопіюйте цілий список з Excel/Telegram.
                    </p>
                    <textarea
                      className="form-control"
                      style={{ height: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                      placeholder={"352999012345678\n353000012345679\n354001012345680"}
                      value={form.imeis}
                      onChange={e => setForm({ ...form, imeis: e.target.value })}
                    />
                    <div className="text-sm text-muted" style={{ marginTop: 8 }}>
                      Розпізнано: <b style={{ color: imeiList.length > 0 ? 'var(--green)' : 'inherit' }}>{imeiList.length}</b> унікальних IMEI-номерів
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              style={{ padding: '16px', fontSize: '16px', marginTop: 10 }}
              onClick={submit}
              disabled={loading || !selectedProduct}
            >
              {loading ? 'Обробка...' : `Підтвердити прийом (${selectedProduct ? (isAccessory ? form.quantity || 0 : imeiList.length) : 0} шт.)`}
            </button>
          </div>
        </div>
      </div>

      {showSupplierModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSupplierModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Новий постачальник</span>
              <button className="modal-close" onClick={() => setShowSupplierModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Ім'я / Назва *</label>
                <input className="form-control" autoFocus value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Наприклад: Apple Inc." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSupplierModal(false)}>Скасувати</button>
              <button className="btn btn-primary" onClick={createSupplier} disabled={!newSupplierName}>Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

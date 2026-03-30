'use client';
import { useState, useEffect } from 'react';

type CartItem = {
  itemId: number; imei: string | null; name: string; salePrice: number; quantity: number; maxQuantity: number;
};
type Client = { id: number; name: string; phone: string | null };

export default function PosPage() {
  const [searchInput, setSearchInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lookup, setLookup] = useState<any[]>([]);
  const [lookupError, setLookupError] = useState('');
  const [searching, setSearching] = useState(false);
  const [selling, setSelling] = useState(false);
  const [saleResult, setSaleResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(setClients).catch(console.error);
  }, []);

  async function addClient() {
    if (!clientForm.name) return;
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientForm)
    });
    if (res.ok) {
      const newClient = await res.json();
      setClients(prev => [...prev, newClient]);
      setSelectedClientId(String(newClient.id));
      setShowAddClient(false);
      setClientForm({ name: '', phone: '' });
    } else {
      const d = await res.json();
      alert('Помилка: ' + d.error);
    }
  }

  async function searchItem() {
    const q = searchInput.trim();
    if (!q) return;
    setLookupError(''); setLookup([]); setSearching(true);

    const r = await fetch(`/api/items?q=${encodeURIComponent(q)}&status=IN_STOCK`);
    const data = await r.json();
    setSearching(false);

    if (!r.ok || !data.length) {
      setLookupError('Нічого не знайдено в наявності');
      return;
    }

    const results = data.map((item: any) => ({
      itemId: item.id,
      imei: item.imei,
      name: `${item.product.brand ? item.product.brand + ' ' : ''}${item.product.name}`,
      price: item.product.price,
      maxQuantity: item.quantity
    }));
    setLookup(results);
  }

  function addToCart(item: any) {
    if (item.maxQuantity <= 0) return;

    const existingIndex = cart.findIndex(c => c.itemId === item.itemId);
    if (existingIndex > -1) {
      const newCart = [...cart];
      if (newCart[existingIndex].quantity < item.maxQuantity) {
        newCart[existingIndex].quantity += 1;
        setCart(newCart);
      } else {
        alert('Недостатньо кількості на залишку');
      }
    } else {
      setCart(c => [...c, { ...item, salePrice: item.price, quantity: 1 }]);
    }
    setLookup([]);
    setSearchInput('');
  }

  function removeFromCart(itemId: number) {
    setCart(c => c.filter(i => i.itemId !== itemId));
  }

  function updatePrice(itemId: number, price: number) {
    setCart(c => c.map(i => i.itemId === itemId ? { ...i, salePrice: price } : i));
  }

  function updateQuantity(itemId: number, qty: number) {
    setCart(c => c.map(i => {
      if (i.itemId === itemId) {
        const validQty = Math.max(1, Math.min(qty, i.maxQuantity));
        return { ...i, quantity: validQty };
      }
      return i;
    }));
  }

  const total = cart.reduce((sum, i) => sum + (i.salePrice * i.quantity), 0);

  async function completeSale() {
    if (cart.length === 0) return;
    setSelling(true); setSaleResult(null);

    const payload = {
      cart: cart.map(c => ({
        itemId: c.itemId,
        quantity: c.quantity,
        salePrice: c.salePrice
      })),
      clientId: selectedClientId || null
    };

    const r = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSelling(false);
    if (r.ok) {
      const resData = await r.json();
      setSaleResult({ ok: true, msg: `Продаж №${resData.transactionId} оформлено! На суму ${total.toLocaleString()} ₴` });
      setCart([]);
      setSelectedClientId('');
    } else {
      const resData = await r.json();
      setSaleResult({ ok: false, msg: `Помилка: ${resData.error || 'Щось пішло не так'}` });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Waynum.Каса</div>
          <div className="page-subtitle">Оформлення продажу</div>
        </div>
      </div>
      <div className="page-body">
        <div className="pos-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Пошук товару</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    className="form-control"
                    placeholder="IMEI, Назва, Бренд або Артикул..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchItem()}
                    style={{ flex: 1, fontSize: 15 }}
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={searchItem} disabled={searching || !searchInput.trim()}>
                    {searching ? 'Шукаю...' : 'Знайти'}
                  </button>
                </div>

                {lookupError && <div className="alert alert-error" style={{ marginTop: 12 }}>{lookupError}</div>}

                {lookup.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="text-sm text-muted" style={{ marginBottom: 10 }}>Результати пошуку:</div>
                    {lookup.map(item => (
                      <div key={item.itemId} style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name} <span className="badge badge-purple">В наявності: {item.maxQuantity} шт</span></div>
                          {item.imei && <div className="font-mono text-muted" style={{ fontSize: 12, marginTop: 4 }}>IMEI: {item.imei}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{item.price.toLocaleString()} ₴</div>
                          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => addToCart(item)}>+ В чек</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Клієнт (Опціонально)</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddClient(!showAddClient)}>
                  {showAddClient ? 'Скасувати' : '+ Новий'}
                </button>
              </div>
              <div className="card-body">
                {showAddClient ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="form-control" placeholder="Ім'я клієнта *" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} />
                    <input className="form-control" placeholder="Телефон" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
                    <button className="btn btn-primary w-full" onClick={addClient} disabled={!clientForm.name}>Створити та вибрати</button>
                  </div>
                ) : (
                  <select className="form-control" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                    <option value="">Без прив'язки до клієнта</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                  </select>
                )}
              </div>
            </div>

            {saleResult && (
              <div className={`alert ${saleResult.ok ? 'alert-success' : 'alert-error'}`} style={{ fontSize: 15 }}>
                {saleResult.msg}
              </div>
            )}
          </div>

          <div className="pos-cart">
            <div className="card-header">
              <span className="card-title">Чек</span>
              <span className="badge badge-purple">{cart.reduce((s, i) => s + i.quantity, 0)} поз.</span>
            </div>

            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">-</div>
                  <div className="empty-state-text">Кошик порожній</div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.itemId} className="pos-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="pos-item-name">{item.name}</div>
                      <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(item.itemId)} style={{ padding: '0 5px', height: 24 }}>✕</button>
                    </div>
                    {item.imei && <div className="pos-item-imei">{item.imei}</div>}

                    <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="text-sm text-muted">К-ть:</span>
                        <input type="number" min="1" max={item.maxQuantity} value={item.quantity} onChange={e => updateQuantity(item.itemId, parseInt(e.target.value) || 1)} className="form-control" style={{ width: 60, padding: '4px 8px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="text-sm text-muted">Ціна (₴):</span>
                        <input type="number" value={item.salePrice} onChange={e => updatePrice(item.itemId, parseFloat(e.target.value) || 0)} className="form-control" style={{ width: 80, padding: '4px 8px', color: 'var(--accent)', fontWeight: 'bold' }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pos-cart-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span className="text-muted">Разом до сплати:</span>
                <span className="pos-cart-total" style={{ color: 'var(--accent)' }}>{total.toLocaleString()} ₴</span>
              </div>
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={completeSale}
                disabled={cart.length === 0 || selling}
              >
                {selling ? 'Оформлення...' : 'Оформити продаж'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

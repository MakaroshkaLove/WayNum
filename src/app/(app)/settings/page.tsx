'use client';
import { useEffect, useState } from 'react';

type Location = { id: number; name: string; type: string };
type User = { id: number; username: string; role: string; locationId: number | null; location?: { name: string } | null };

export default function SettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locForm, setLocForm] = useState({ name: '', type: 'STORE' });
  const [locMsg, setLocMsg] = useState('');
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'CASHIER', locationId: '', permissions: [] as string[] });
  const [userMsg, setUserMsg] = useState('');

  const AVAILABLE_PERMISSIONS = [
    { id: 'pos', label: 'Каса' },
    { id: 'inventory', label: 'Залишки' },
    { id: 'sales', label: 'Продажі' },
    { id: 'products', label: 'Товарна база' },
    { id: 'receive', label: 'Прийом товару' },
    { id: 'transfer', label: 'Переміщення' },
    { id: 'clients', label: 'Клієнти' }
  ];

  async function loadAll() {
    const [l, u] = await Promise.all([
      fetch('/api/locations').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]);
    setLocations(l);
    setUsers(u);
  }

  useEffect(() => { loadAll(); }, []);

  async function addLocation() {
    setLocMsg('');
    const r = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locForm),
    });
    if (r.ok) {
      setLocMsg('✅ Точку додано');
      setLocForm({ name: '', type: 'STORE' });
      loadAll();
    } else {
      const d = await r.json();
      setLocMsg('❌ ' + d.error);
    }
  }

  async function deleteLocation(id: number) {
    if (!confirm('Ви дійсно хочете видалити цю точку продажу? Це неможливо відмінити.')) return;
    setLocMsg('');
    const r = await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      setLocMsg('✅ Точку успішно видалено');
      loadAll();
    } else {
      const d = await r.json();
      setLocMsg('❌ ' + d.error);
    }
  }

  async function addUser() {
    setUserMsg('');
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userForm, locationId: userForm.locationId || null }),
    });
    if (r.ok) {
      setUserMsg('Користувача додано');
      setUserForm({ username: '', password: '', role: 'CASHIER', locationId: '', permissions: [] });
      loadAll();
    } else {
      const d = await r.json();
      setUserMsg('Помилка: ' + d.error);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Ви дійсно хочете видалити цього співробітника?')) return;
    setUserMsg('');
    const r = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      setUserMsg('✅ Користувача успішно видалено');
      loadAll();
    } else {
      const d = await r.json();
      setUserMsg('❌ ' + d.error);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Налаштування</div>
          <div className="page-subtitle">Управління точками та співробітниками</div>
        </div>
      </div>
      <div className="page-body">
        <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>

          {/* Locations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">📍 Додати точку продажу</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {locMsg && <div className={`alert ${locMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{locMsg}</div>}
                <div className="form-group">
                  <label className="form-label">Назва точки *</label>
                  <input className="form-control" placeholder="Магазин 3 / Склад 2" value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Тип</label>
                  <select className="form-control" value={locForm.type} onChange={e => setLocForm({ ...locForm, type: e.target.value })}>
                    <option value="STORE">Магазин</option>
                    <option value="WAREHOUSE">Склад</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={addLocation} disabled={!locForm.name}>+ Додати точку</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Всі точки ({locations.length})</span></div>
              {locations.map(l => (
                <div key={l.id} className="recent-item">
                  <div style={{ fontSize: 20 }}>{l.type === 'WAREHOUSE' ? '🏭' : '🏪'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    <div className="text-sm text-muted">{l.type === 'WAREHOUSE' ? 'Склад' : 'Магазин'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`badge ${l.type === 'WAREHOUSE' ? 'badge-purple' : 'badge-blue'}`}>#{l.id}</span>
                    {l.id !== 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteLocation(l.id)}>Видалити</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">👤 Додати співробітника</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {userMsg && <div className={`alert ${userMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{userMsg}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Логін *</label>
                    <input className="form-control" placeholder="ivan_seller" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Пароль *</label>
                    <input className="form-control" type="password" placeholder="••••••" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Роль</label>
                    <select className="form-control" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                      <option value="CASHIER">Касир</option>
                      <option value="ADMIN">Адмін</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Точка продажу</label>
                    <select className="form-control" value={userForm.locationId} onChange={e => setUserForm({ ...userForm, locationId: e.target.value })}>
                      <option value="">Не прив'язаний</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Права доступу (для касирів)</label>
                  {userForm.role === 'ADMIN' ? (
                    <div className="text-sm text-muted" style={{ padding: '8px 0' }}>Адміністратор має доступ до всіх розділів автоматично.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                      {AVAILABLE_PERMISSIONS.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={userForm.permissions.includes(p.id)} 
                            onChange={() => {
                              const set = new Set(userForm.permissions);
                              set.has(p.id) ? set.delete(p.id) : set.add(p.id);
                              setUserForm({ ...userForm, permissions: Array.from(set) });
                            }} 
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" onClick={addUser} disabled={!userForm.username || !userForm.password}>+ Додати</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Всі співробітники ({users.length})</span></div>
              {users.map(u => (
                <div key={u.id} className="recent-item">
                  <div className="user-avatar" style={{ width: 34, height: 34, flexShrink: 0 }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{u.username}</div>
                    <div className="text-sm text-muted">{u.location?.name || 'Без точки'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-yellow' : 'badge-green'}`}>
                      {u.role === 'ADMIN' ? 'Адмін' : 'Касир'}
                    </span>
                    {u.role !== 'ADMIN' && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>
                        Видалити
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

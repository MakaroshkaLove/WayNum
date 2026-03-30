'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

type User = { username: string; role: string; locationId?: number | null; permissions?: string[] };

const NAV_ALL = [
  { id: 'dashboard', href: '/dashboard', icon: '▪', label: 'Дашборд' },
  { id: 'pos', href: '/pos', icon: '▪', label: 'Каса' },
  { id: 'sales', href: '/sales', icon: '▪', label: 'Продажі' },
  { id: 'inventory', href: '/inventory', icon: '▪', label: 'Залишки' },
  { id: 'receive', href: '/receive', icon: '▪', label: 'Прийом товару' },
  { id: 'transfer', href: '/transfer', icon: '▪', label: 'Переміщення' },
  { id: 'products', href: '/products', icon: '▪', label: 'Товарна база' },
  { id: 'clients', href: '/clients', icon: '▪', label: 'Клієнти' },
  { id: 'settings', href: '/settings', icon: '▪', label: 'Налаштування' },
];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = user.role === 'ADMIN' ? NAV_ALL : NAV_ALL.filter(n => user.permissions?.includes(n.id));

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">W</div>
        <span className="sidebar-logo-text">Waynum</span>
      </div>

      <nav className="sidebar-nav">
        {user.role === 'ADMIN' && (
          <div className="sidebar-section-label">Головне</div>
        )}
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{user.username[0].toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user.username}</div>
            <div className="user-role">{user.role === 'ADMIN' ? 'Адміністратор' : 'Касир'}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Вийти">⏏</button>
        </div>
      </div>
    </aside>
  );
}

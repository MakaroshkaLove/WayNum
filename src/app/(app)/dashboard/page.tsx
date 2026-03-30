import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isFullAccess = session.role === 'ADMIN' || (session.permissions || []).includes('dashboard');

  const [itemsInStock, transactions, locations] = await Promise.all([
    prisma.item.findMany({ where: { status: 'IN_STOCK' } }),
    prisma.transaction.findMany({
      where: { type: 'SALE' },
      include: {
        items: { include: { item: { include: { product: true } } } },
        sourceLocation: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.location.findMany({
      include: { items: { where: { status: 'IN_STOCK' } } },
    }),
  ]);


  const stockQty = itemsInStock.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const stockCapital = itemsInStock.reduce((acc, i) => acc + ((i.quantity || 1) * i.purchasePrice), 0);

  const soldQty = transactions.reduce((sum, t) => sum + t.items.reduce((s2, i) => s2 + i.quantity, 0), 0);
  const totalRevenue = transactions.reduce((sum, t) => sum + t.items.reduce((s2, i) => s2 + (i.price * i.quantity), 0), 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.items.reduce((s2, i) => s2 + ((i.price - i.item.purchasePrice) * i.quantity), 0), 0);

  const recentSales = transactions.slice(0, 8);

  const formatDate = (d: Date) =>
    new Date(d).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Аналітика бізнесу</div>
          <div className="page-subtitle">Дохід, залишки та останні операції</div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isFullAccess ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon purple">#</div>
            <div>
              <div className="stat-value">{stockQty}</div>
              <div className="stat-label">Товарів на залишку</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">↑</div>
            <div>
              <div className="stat-value">{soldQty}</div>
              <div className="stat-label">Продано одиниць</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">₴</div>
            <div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{totalRevenue.toLocaleString()} ₴</div>
              <div className="stat-label">Обіг продажів</div>
            </div>
          </div>
          {isFullAccess && (
            <div className="stat-card">
              <div className="stat-icon yellow">₴</div>
              <div>
                <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalProfit.toLocaleString()} ₴</div>
                <div className="stat-label">Чистий прибуток</div>
              </div>
            </div>
          )}
        </div>

        {isFullAccess && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-muted text-sm">Вкладений капітал зараз:</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{stockCapital.toLocaleString()} ₴</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-muted text-sm">Активних торгових точок:</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>{locations.length}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid-2" style={{ gap: 20 }}>
          {/* Locations breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Залишки по точках</span>
            </div>
            <div>
              {locations.map(loc => {
                const locQty = loc.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
                return (
                  <div key={loc.id} className="recent-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{loc.name}</div>
                      <div className="text-sm text-muted">{loc.type === 'WAREHOUSE' ? 'Склад' : 'Магазин'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${loc.type === 'WAREHOUSE' ? 'badge-purple' : 'badge-blue'}`}>
                        {locQty} шт
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Останні чеки</span>
            </div>
            {recentSales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">-</div>
                <div className="empty-state-text">Продажів ще немає</div>
              </div>
            ) : (
              <div>
                {recentSales.map(sale => {
                  const saleSum = sale.items.reduce((s, i) => s + (i.price * i.quantity), 0);
                  return (
                    <div key={sale.id} className="recent-item" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          Чек #{sale.id} · <span style={{ color: 'var(--accent)' }}>{saleSum.toLocaleString()} ₴</span>
                        </div>
                        <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: 16, marginTop: 4 }}>
                          {sale.items.map((i, idx) => (
                            <li key={idx}>
                              {i.item.product.name} {i.item.imei ? `(${i.item.imei})` : `x${i.quantity}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-sm text-muted" style={{ textAlign: 'right' }}>
                        <div>{formatDate(sale.createdAt)}</div>
                        <div style={{ marginTop: 4 }}><span className="badge badge-green">{sale.sourceLocation?.name || 'Система'}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

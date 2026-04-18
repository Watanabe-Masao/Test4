// NavRail — 56px-wide left rail, emoji page icons, brand logo at top.
// Mirrors the app's pageRegistry — nav items are pages.

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'ダッシュボード' },
  { id: 'daily', icon: '📅', label: '日別売上' },
  { id: 'factor', icon: '📈', label: '要因分解' },
  { id: 'category', icon: '📦', label: 'カテゴリ' },
  { id: 'purchase', icon: '🛒', label: '仕入' },
  { id: 'budget', icon: '💰', label: '予算' },
  { id: 'forecast', icon: '🔮', label: '需要予測' },
  { id: 'reports', icon: '📋', label: 'レポート' },
  { id: 'weather', icon: '🌤', label: '天気相関' },
]

function NavRail({ active, onNavigate, theme, onToggleTheme }) {
  return (
    <aside className="nav-rail">
      <div className="nav-logo" title="仕入粗利管理ツール">荒</div>
      <div className="nav-sep" />
      <div className="nav-list">
        {NAV_ITEMS.map((it) => (
          <button
            key={it.id}
            className={`nav-btn${active === it.id ? ' is-active' : ''}`}
            onClick={() => onNavigate(it.id)}
            title={it.label}
          >
            <span className="nav-icon">{it.icon}</span>
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </div>
      <div className="nav-bottom">
        <button className="nav-btn" onClick={() => onNavigate('admin')} title="管理">
          <span className="nav-icon">⚙️</span>
        </button>
        <button className="nav-btn" onClick={onToggleTheme} title="テーマ切替">
          <span className="nav-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
        </button>
      </div>
    </aside>
  )
}

window.NavRail = NavRail
window.NAV_ITEMS = NAV_ITEMS

export function renderAppShell() {
  return `
    <div class="app">
      <nav class="nav">
        <div class="nav-logo">📊</div>
        <div class="nav-item active" title="データ管理">📁</div>
        <div class="nav-item" title="分析">📈</div>
        <div class="nav-spacer"></div>
        <div class="nav-item" title="テーマ切替">🌙</div>
      </nav>
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">仕入粗利管理</div>
          <div class="sidebar-heading">取引先別フォーマット v8</div>
        </div>
        <div class="sidebar-content">
          <div class="section-label">📁 データファイル</div>
          <p class="migration-note">既存UI互換を維持したまま、段階的にTSモジュールへ移行中です。</p>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="topbar-title">仕入粗利管理システム</div>
        </header>
        <div class="content" id="content"></div>
      </main>
    </div>
  `;
}

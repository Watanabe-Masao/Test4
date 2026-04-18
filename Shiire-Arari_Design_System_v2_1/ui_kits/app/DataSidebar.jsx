// DataSidebar — 260px sidebar for file drop + data management.
// Mirrors the empty-state copy and file-drop idiom from the real app.

function DataSidebar({ files, onImport, calcStatus }) {
  const totalRows = files.reduce((s, f) => s + f.rows, 0)
  return (
    <aside className="ds-sidebar">
      <div className="ds-sidebar-head">
        <div className="ds-eyebrow">データ管理</div>
        <div className="ds-sidebar-title">インポート済みファイル</div>
      </div>

      <div className="ds-dropzone" onClick={onImport}>
        <div className="ds-dz-icon">⤓</div>
        <div className="ds-dz-primary">ファイルをドラッグ＆ドロップ</div>
        <div className="ds-dz-secondary">
          Excel / CSV に対応。左のサイドバーから<br/>
          ファイルを落とすと自動で計算されます。
        </div>
        <button className="btn btn-primary ds-dz-btn" onClick={(e) => { e.stopPropagation(); onImport() }}>
          ファイルを選択
        </button>
      </div>

      <div className="ds-sidebar-section">
        <div className="ds-row-head">
          <div className="ds-eyebrow">ファイル ({files.length})</div>
          <div className="ds-row-meta">{totalRows.toLocaleString()} 行</div>
        </div>
        <ul className="ds-file-list">
          {files.map((f) => (
            <li key={f.id} className="ds-file-item">
              <div className="ds-file-ico">{f.kind === 'sales' ? '📈' : f.kind === 'purchase' ? '🛒' : '📋'}</div>
              <div className="ds-file-body">
                <div className="ds-file-name">{f.name}</div>
                <div className="ds-file-meta">
                  <span className="mono">{f.rows.toLocaleString()} 行</span>
                  <span>·</span>
                  <span>{f.period}</span>
                </div>
              </div>
              <button className="ds-file-x" title="削除">×</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="ds-sidebar-section">
        <div className="ds-row-head">
          <div className="ds-eyebrow">計算ステータス</div>
        </div>
        <div className="ds-calc">
          {calcStatus.map((s) => (
            <div key={s.id} className="ds-calc-row">
              <span className={`status-dot dot-${s.state}`} />
              <span className="ds-calc-name">{s.name}</span>
              <span className={`ds-calc-st ds-calc-st-${s.state}`}>
                {s.state === 'done' ? '計算済み' : s.state === 'running' ? '計算中…' : '未計算'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

window.DataSidebar = DataSidebar

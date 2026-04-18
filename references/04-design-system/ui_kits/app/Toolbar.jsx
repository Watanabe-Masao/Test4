// Header bar above main content: title, date-range chip group, breadcrumb,
// and action chips ("並べ替え", "編集完了") on the right — this matches the toolbar idiom.

function Toolbar({ title, breadcrumbs, range, onRange, editMode, onToggleEdit }) {
  return (
    <header className="toolbar">
      <div className="tb-left">
        <div className="tb-breadcrumb">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <span className={i === breadcrumbs.length - 1 ? 'tb-crumb-current' : 'tb-crumb'}>{b}</span>
              {i < breadcrumbs.length - 1 && <span className="tb-crumb-sep">›</span>}
            </React.Fragment>
          ))}
        </div>
        <h1 className="tb-title">{title}</h1>
      </div>
      <div className="tb-right">
        <div className="chip-group" role="tablist">
          {['日次', '週次', '月次', '年次'].map((r) => (
            <button key={r}
              className={`chip${range === r ? ' is-on' : ''}`}
              onClick={() => onRange(r)}>
              {r}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost">並べ替え</button>
        <button className={`btn ${editMode ? 'btn-primary' : 'btn-outline'}`} onClick={onToggleEdit}>
          {editMode ? '編集完了' : 'ウィジェット設定'}
        </button>
      </div>
    </header>
  )
}

window.Toolbar = Toolbar

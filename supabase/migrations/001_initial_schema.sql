-- Supabase 初期スキーマ
-- 仕入荒利管理システムの正規化マスターデータベース

-- 月別データスライス
CREATE TABLE IF NOT EXISTS monthly_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  data_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month, data_type)
);

-- セッションメタデータ
CREATE TABLE IF NOT EXISTS session_meta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

-- 同期ログ
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  data_type TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_monthly_data_year_month ON monthly_data (year, month);
CREATE INDEX IF NOT EXISTS idx_sync_log_year_month ON sync_log (year, month);
CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON sync_log (synced_at);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_data_updated_at
  BEFORE UPDATE ON monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- 匿名アクセスポリシー（開発用 / 将来的に認証ベースに変更）
CREATE POLICY "Allow anonymous access to monthly_data"
  ON monthly_data FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous access to session_meta"
  ON session_meta FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous access to sync_log"
  ON sync_log FOR ALL
  USING (true)
  WITH CHECK (true);

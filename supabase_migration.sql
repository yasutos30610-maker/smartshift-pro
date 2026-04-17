-- ============================================================
-- SmartShift PRO — 認証・ユーザー管理マイグレーション
-- Supabase の SQL Editor で実行してください
-- ============================================================

-- ① ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT        UNIQUE NOT NULL,
  password_hash TEXT       NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('admin', 'area_manager', 'store_manager')),
  display_name TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ② ユーザー×店舗 紐付けテーブル（AM / SM 用）
CREATE TABLE IF NOT EXISTS user_store_assignments (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  UNIQUE(user_id, store_id)
);

-- ③ RLS（Row Level Security）有効化
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_store_assignments ENABLE ROW LEVEL SECURITY;

-- anon キーで users を読み取り可能（ログイン認証に必要）
CREATE POLICY "allow_anon_read_users"
  ON users FOR SELECT
  USING (true);

-- anon キーで user_store_assignments を読み取り可能
CREATE POLICY "allow_anon_read_assignments"
  ON user_store_assignments FOR SELECT
  USING (true);

-- anon キーで users を変更可能（管理画面からの作成・更新・削除に必要）
CREATE POLICY "allow_anon_write_users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- anon キーで assignments を変更可能
CREATE POLICY "allow_anon_write_assignments"
  ON user_store_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

-- ④ 初期 Admin ユーザー挿入
--    ID: master2515 / PASS: StoreAdmin2525!（bcrypt ハッシュ済み）
INSERT INTO users (username, password_hash, role, display_name)
VALUES (
  'master2515',
  '$2b$10$eWSnHSsq60UzCqXblGMKzOGIxApAUtqxwYpgGBVv1XfAgvjlzgGWi',
  'admin',
  'マスター管理者'
)
ON CONFLICT (username) DO NOTHING;

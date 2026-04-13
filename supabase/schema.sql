-- SmartShift PRO — Supabase Schema
-- Supabaseダッシュボードの SQL Editor で実行してください

-- ─── シフトデータ（メイン保存先）─────────────────────────────────────────────
-- 1店舗 × 1ヶ月分のアプリ全データをJSONBで保存するシンプル設計。
-- 将来的にカラム分割が必要になった時点でリファクタリング可能。

create table if not exists shift_data (
  id          text        primary key,          -- "{storeId}_{year}_{month}" 形式
  store_id    text        not null,
  year        integer     not null,
  month       integer     not null,
  payload     jsonb       not null,             -- AppData JSON全体
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at 自動更新トリガー
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shift_data_updated_at on shift_data;
create trigger shift_data_updated_at
  before update on shift_data
  for each row execute procedure set_updated_at();

-- ─── 共有スナップショット ──────────────────────────────────────────────────────
-- URLシェア機能用。shareId をキーにスナップショットを保存する。
-- 7日後に自動削除（pg_cron が使えない場合は手動 or Edge Function で定期削除）

create table if not exists shared_snapshots (
  share_id    text        primary key,          -- "ss_xxxxxxxx" 形式
  payload     jsonb       not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

-- ─── RLS（Row Level Security）─────────────────────────────────────────────────
-- 現時点ではanon keyから読み書き可能にしておく（MVP段階）。
-- スタッフ認証を追加した時点でポリシーを厳格化する。

alter table shift_data          enable row level security;
alter table shared_snapshots    enable row level security;

-- shift_data: 全員が読み書き可能（MVP）
create policy "allow_all_shift_data" on shift_data
  for all using (true) with check (true);

-- shared_snapshots: 全員が読み書き可能（MVP）
create policy "allow_all_shared_snapshots" on shared_snapshots
  for all using (true) with check (true);

-- ─── インデックス ─────────────────────────────────────────────────────────────
create index if not exists idx_shift_data_store_year_month
  on shift_data (store_id, year, month);

create index if not exists idx_shared_snapshots_expires
  on shared_snapshots (expires_at);

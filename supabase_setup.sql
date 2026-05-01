-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  chain       TEXT NOT NULL,
  category    TEXT DEFAULT 'hot',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies — each user can only see/modify their own wallets
CREATE POLICY "Users can view their own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets"
  ON wallets FOR DELETE
  USING (auth.uid() = user_id);

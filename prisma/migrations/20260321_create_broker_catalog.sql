CREATE TABLE IF NOT EXISTS "Broker" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "logoUrl" TEXT,
  "logoEmoji" TEXT DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'LOCKED',
  "providerKey" TEXT NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "Broker" ("id", "name", "description", "logoEmoji", "status", "providerKey", "sortOrder")
VALUES
  ('tinkoff', 'T-Invest', 'Акции, облигации, ETF на Московской бирже', '', 'ACTIVE', 'TINKOFF', 1),
  ('ib', 'Interactive Brokers', 'Международные рынки, акции, опционы, фьючерсы', '', 'LOCKED', 'IB', 2),
  ('finam', 'Финам', 'Акции, облигации, валюта на Московской бирже', '', 'LOCKED', 'FINAM', 3)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Broker" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read brokers" ON "Broker"
  FOR SELECT USING (true);

CREATE POLICY "Service role full access brokers" ON "Broker"
  FOR ALL USING (auth.role() = 'service_role');

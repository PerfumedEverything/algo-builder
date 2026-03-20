CREATE TABLE IF NOT EXISTS "StrategyOperation" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "strategyId" TEXT NOT NULL REFERENCES "Strategy"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL CHECK ("type" IN ('BUY', 'SELL')),
  "instrument" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "StrategyOperation_strategyId_idx" ON "StrategyOperation" ("strategyId");
CREATE INDEX IF NOT EXISTS "StrategyOperation_userId_idx" ON "StrategyOperation" ("userId");

ALTER TABLE "StrategyOperation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own operations" ON "StrategyOperation"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Service role full access operations" ON "StrategyOperation"
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE "Signal" ADD COLUMN IF NOT EXISTS "logicOperator" TEXT NOT NULL DEFAULT 'AND';
ALTER TABLE "Signal" ADD COLUMN IF NOT EXISTS "strategyId" TEXT;

CREATE INDEX IF NOT EXISTS "Signal_strategyId_idx" ON "Signal" ("strategyId");

ALTER TABLE "Signal" ADD CONSTRAINT "Signal_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

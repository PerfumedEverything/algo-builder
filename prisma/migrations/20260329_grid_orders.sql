CREATE TABLE IF NOT EXISTS "grid_orders" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "grid_id"      TEXT NOT NULL REFERENCES "Strategy"("id") ON DELETE CASCADE,
  "user_id"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "level_index"  INT NOT NULL,
  "price"        DECIMAL(20, 8) NOT NULL,
  "side"         TEXT NOT NULL CHECK ("side" IN ('BUY', 'SELL')),
  "quantity"     DECIMAL(20, 8) NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK ("status" IN ('PENDING', 'FILLED', 'CANCELLED')),
  "filled_at"    TIMESTAMPTZ,
  "filled_price" DECIMAL(20, 8),
  "realized_pnl" DECIMAL(20, 8) DEFAULT 0,
  "created_at"   TIMESTAMPTZ DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("grid_id", "level_index", "side")
);

CREATE INDEX IF NOT EXISTS "idx_grid_orders_grid_id" ON "grid_orders"("grid_id");
CREATE INDEX IF NOT EXISTS "idx_grid_orders_status" ON "grid_orders"("grid_id", "status");

ALTER TABLE "grid_orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own grid orders"
  ON "grid_orders" FOR ALL
  USING (auth.uid()::text = "user_id");

CREATE POLICY "Service role full access grid orders"
  ON "grid_orders" FOR ALL
  USING (auth.role() = 'service_role');

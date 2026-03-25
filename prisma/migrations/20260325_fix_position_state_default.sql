ALTER TABLE "Strategy"
  ALTER COLUMN "positionState" SET DEFAULT 'NONE';

UPDATE "Strategy" SET "positionState" = 'NONE' WHERE "positionState" IS NULL;

-- Migration: Clean @ suffix from instrument fields in Strategy and Signal tables
-- Run manually on production via Supabase SQL Editor
-- Date: 2026-03-25
-- Phase: 02.3 Strategy & Portfolio Hardening

BEGIN;

-- Clean Strategy instruments
UPDATE "Strategy"
SET instrument = REPLACE(instrument, '@', ''),
    "updatedAt" = NOW()
WHERE instrument LIKE '%@';

-- Clean Signal instruments
UPDATE "Signal"
SET instrument = REPLACE(instrument, '@', ''),
    "updatedAt" = NOW()
WHERE instrument LIKE '%@';

COMMIT;

-- Verify: should return 0 rows
SELECT id, instrument FROM "Strategy" WHERE instrument LIKE '%@';
SELECT id, instrument FROM "Signal" WHERE instrument LIKE '%@';

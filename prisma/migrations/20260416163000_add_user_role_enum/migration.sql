-- Migration: add_user_role_enum
-- Created: 2026-04-16
-- Fix: UserRole enum was missing from database

-- Create UserRole enum if not exists
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop existing role column default to avoid cast issue
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Alter role column to use enum type
ALTER TABLE users ALTER COLUMN role TYPE "UserRole" USING role::"UserRole";

-- Add default back
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STAFF'::"UserRole";
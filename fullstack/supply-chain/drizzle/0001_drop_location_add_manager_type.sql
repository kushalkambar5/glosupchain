-- Drop location column and add managerType column to users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "location";
ALTER TABLE "users" ADD COLUMN "manager_type" text;

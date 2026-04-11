-- Fix assignment_id column type to uuid with proper casting
ALTER TABLE "routes" ALTER COLUMN "assignment_id" TYPE uuid USING "assignment_id"::uuid;

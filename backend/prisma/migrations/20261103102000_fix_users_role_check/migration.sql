-- AlterTable: update users_role_check to include decision_maker
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_check";
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('admin', 'analyst', 'decision_maker', 'planner', 'viewer'));


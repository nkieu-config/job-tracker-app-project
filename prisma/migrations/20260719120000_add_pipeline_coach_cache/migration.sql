-- Cache the AI pipeline-coach output per user. Nullable: a user has no advice
-- until they generate it, and `coachHash` fingerprints the pipeline snapshot the
-- advice was written for, so regenerating on an unchanged pipeline can no-op
-- instead of spending a slice of the hourly AI budget.
ALTER TABLE "user" ADD COLUMN "coachAdvice" JSONB;
ALTER TABLE "user" ADD COLUMN "coachHash" TEXT;
ALTER TABLE "user" ADD COLUMN "coachAt" TIMESTAMP(3);

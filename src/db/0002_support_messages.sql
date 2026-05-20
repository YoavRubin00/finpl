-- Support inbox messages. Users submit a free-text message from the in-app
-- "פנו אלינו לתמיכה" Shark chat. Distinct table from `user_feedback` so the
-- support inbox stays focused and can grow its own status/reply fields later.

CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID,
    "user_email" TEXT,
    "message" TEXT NOT NULL,
    "platform" TEXT,
    "app_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "support_messages_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "user_profiles" ("id") ON DELETE SET NULL,
    CONSTRAINT "support_messages_status_check" CHECK ("status" IN ('new', 'in_progress', 'resolved'))
);

CREATE INDEX IF NOT EXISTS "idx_support_messages_user" ON "support_messages" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_support_messages_created" ON "support_messages" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_support_messages_status" ON "support_messages" USING btree ("status");

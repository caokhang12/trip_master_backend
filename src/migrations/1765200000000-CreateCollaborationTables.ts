import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCollaborationTables1765200000000
  implements MigrationInterface
{
  name = 'CreateCollaborationTables1765200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist
    const tripMembersExists = await queryRunner.hasTable('trip_members');

    if (!tripMembersExists) {
      // Create trip_members table
      await queryRunner.query(`
        CREATE TYPE "member_role_enum" AS ENUM ('owner', 'editor', 'viewer')
      `);

      await queryRunner.query(`
        CREATE TABLE "trip_members" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "trip_id" uuid NOT NULL,
          "user_id" uuid NOT NULL,
          "role" "member_role_enum" NOT NULL DEFAULT 'viewer',
          "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_trip_members" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_trip_members_trip_user" UNIQUE ("trip_id", "user_id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_trip_members_trip_id" ON "trip_members" ("trip_id")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_trip_members_user_id" ON "trip_members" ("user_id")
      `);

      await queryRunner.query(`
        ALTER TABLE "trip_members"
        ADD CONSTRAINT "FK_trip_members_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
      `);

      await queryRunner.query(`
        ALTER TABLE "trip_members"
        ADD CONSTRAINT "FK_trip_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      `);

      console.log('✅ Created trip_members table');
    } else {
      console.log('⏭️  trip_members table already exists, skipping creation');
    }

    const tripInvitationsExists =
      await queryRunner.hasTable('trip_invitations');

    if (!tripInvitationsExists) {
      // Create trip_invitations table
      await queryRunner.query(`
        CREATE TYPE "invitation_status_enum" AS ENUM ('pending', 'accepted', 'declined', 'expired')
      `);

      await queryRunner.query(`
        CREATE TABLE "trip_invitations" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "trip_id" uuid NOT NULL,
          "inviter_id" uuid NOT NULL,
          "email" character varying(255) NOT NULL,
          "role" "member_role_enum" NOT NULL DEFAULT 'viewer',
          "token" character varying(255) NOT NULL,
          "status" "invitation_status_enum" NOT NULL DEFAULT 'pending',
          "expires_at" TIMESTAMP NOT NULL,
          "accepted_at" TIMESTAMP,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_trip_invitations" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_trip_invitations_token" UNIQUE ("token")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_trip_invitations_trip_email" ON "trip_invitations" ("trip_id", "email")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_trip_invitations_token" ON "trip_invitations" ("token")
      `);

      await queryRunner.query(`
        ALTER TABLE "trip_invitations"
        ADD CONSTRAINT "FK_trip_invitations_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
      `);

      await queryRunner.query(`
        ALTER TABLE "trip_invitations"
        ADD CONSTRAINT "FK_trip_invitations_inviter" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE
      `);

      console.log('✅ Created trip_invitations table');
    } else {
      console.log(
        '⏭️  trip_invitations table already exists, skipping creation',
      );
    }

    const tripActivityLogsExists =
      await queryRunner.hasTable('trip_activity_logs');

    if (!tripActivityLogsExists) {
      // Create trip_activity_logs table
      await queryRunner.query(`
        CREATE TYPE "activity_action_enum" AS ENUM (
          'member_invited',
          'member_joined',
          'member_left',
          'member_removed',
          'role_changed',
          'trip_created',
          'trip_updated',
          'trip_deleted'
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "trip_activity_logs" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "trip_id" uuid NOT NULL,
          "user_id" uuid,
          "action" "activity_action_enum" NOT NULL,
          "metadata" jsonb,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_trip_activity_logs" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_trip_activity_logs_trip_created" ON "trip_activity_logs" ("trip_id", "created_at")
      `);

      await queryRunner.query(`
        ALTER TABLE "trip_activity_logs"
        ADD CONSTRAINT "FK_trip_activity_logs_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
      `);

      await queryRunner.query(`
        ALTER TABLE "trip_activity_logs"
        ADD CONSTRAINT "FK_trip_activity_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      `);

      console.log('✅ Created trip_activity_logs table');
    } else {
      console.log(
        '⏭️  trip_activity_logs table already exists, skipping creation',
      );
    }

    // Migrate existing trips to have owners as members (only if trip_members was empty)
    if (!tripMembersExists) {
      const memberCount: any[] = await queryRunner.query(
        `SELECT COUNT(*) FROM trip_members`,
      );
      if (memberCount[0].count === '0') {
        await queryRunner.query(`
          INSERT INTO "trip_members" ("trip_id", "user_id", "role", "joined_at")
          SELECT id, user_id, 'owner', created_at
          FROM trips
          WHERE user_id IS NOT NULL
        `);
        console.log('✅ Migrated existing trip owners to trip_members');
      }
    }

    console.log('✅ Collaboration tables setup completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    const tripActivityLogsExists =
      await queryRunner.hasTable('trip_activity_logs');
    const tripInvitationsExists =
      await queryRunner.hasTable('trip_invitations');
    const tripMembersExists = await queryRunner.hasTable('trip_members');

    if (tripActivityLogsExists) {
      await queryRunner.dropTable('trip_activity_logs');
    }

    if (tripInvitationsExists) {
      await queryRunner.dropTable('trip_invitations');
    }

    if (tripMembersExists) {
      await queryRunner.dropTable('trip_members');
    }

    // Drop enums (only if they exist)
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "activity_action_enum"`);
    } catch {
      // Type might not exist
    }
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "invitation_status_enum"`);
    } catch {
      // Type might not exist
    }
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "member_role_enum"`);
    } catch {
      // Type might not exist
    }

    console.log('✅ Rolled back collaboration tables');
  }
}

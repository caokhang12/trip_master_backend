import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixActivitiesRelation1756964150000 implements MigrationInterface {
  name = 'FixActivitiesRelation1756964150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP CONSTRAINT "FK_3a9b2a3b41eb13c854882f2afc0"`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_destinations" ("activity_id" uuid NOT NULL, "destination_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_107db76d0bed6642b1d56d476ed" PRIMARY KEY ("activity_id", "destination_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP COLUMN "destination_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD "destination_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_destinations" ADD CONSTRAINT "FK_6b93fa245aa81a7bc3068e556a5" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_destinations" ADD CONSTRAINT "FK_c390264188dfd92d80fce435400" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_destinations" DROP CONSTRAINT "FK_c390264188dfd92d80fce435400"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_destinations" DROP CONSTRAINT "FK_6b93fa245aa81a7bc3068e556a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP COLUMN "destination_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD "destination_id" uuid NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "activity_destinations"`);
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD CONSTRAINT "FK_3a9b2a3b41eb13c854882f2afc0" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}

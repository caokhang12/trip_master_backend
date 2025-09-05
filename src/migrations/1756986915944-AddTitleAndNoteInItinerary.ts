import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTitleAndNoteInItinerary1756986915944 implements MigrationInterface {
    name = 'AddTitleAndNoteInItinerary1756986915944'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "itineraries" ADD "title" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "itineraries" ADD "notes" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "itineraries" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "itineraries" DROP COLUMN "title"`);
    }

}

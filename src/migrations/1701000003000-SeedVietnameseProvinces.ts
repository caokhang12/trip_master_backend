import { MigrationInterface, QueryRunner } from 'typeorm';
import axios from 'axios';

export class SeedVietnameseProvinces1701000003000
  implements MigrationInterface
{
  name = 'SeedVietnameseProvinces1701000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the vietnam_locations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vietnam_locations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "province_id" integer,
        "district_id" integer,
        "ward_id" integer,
        "province_name" varchar(255) NOT NULL,
        "district_name" varchar(255),
        "ward_name" varchar(255),
        "full_name" text NOT NULL,
        "coordinates" geometry(Point, 4326),
        "type" varchar(10),
        "slug" varchar(50),
        "name_with_type" varchar(255),
        "path" text,
        "path_with_type" text,
        "created_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("province_id", "district_id", "ward_id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vietnam_locations_province_name" 
      ON "vietnam_locations" ("province_name")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vietnam_locations_coordinates" 
      ON "vietnam_locations" USING GIST ("coordinates")
    `);

    try {
      console.log('Fetching Vietnamese provinces data...');

      // Fetch provinces
      const provincesResponse = await axios.get(
        'https://provinces.open-api.vn/api/p/',
        {
          timeout: 10000,
        },
      );

      const provinces = provincesResponse.data;
      console.log(`Found ${provinces.length} provinces`);

      for (const province of provinces) {
        // Insert province
        await queryRunner.query(
          `
          INSERT INTO "vietnam_locations" (
            "province_id", "province_name", "full_name", "type", "slug", 
            "name_with_type", "path", "path_with_type"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT ("province_id", "district_id", "ward_id")
          DO NOTHING
        `,
          [
            province.code,
            province.name,
            province.name_with_type || province.name,
            province.type || 'province',
            province.slug || province.name.toLowerCase().replace(/\s+/g, '-'),
            province.name_with_type || province.name,
            province.name,
            province.name_with_type || province.name,
          ],
        );

        // Fetch and insert districts for this province
        try {
          console.log(`Fetching districts for ${province.name}...`);
          const districtsResponse = await axios.get(
            `https://provinces.open-api.vn/api/p/${province.code}?depth=2`,
            { timeout: 5000 },
          );

          const provinceWithDistricts = districtsResponse.data;
          const districts = provinceWithDistricts.districts || [];

          for (const district of districts) {
            await queryRunner.query(
              `
              INSERT INTO "vietnam_locations" (
                "province_id", "district_id", "province_name", "district_name", 
                "full_name", "type", "slug", "name_with_type", "path", "path_with_type"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT ("province_id", "district_id", "ward_id")
              DO NOTHING
            `,
              [
                province.code,
                district.code,
                province.name,
                district.name,
                `${district.name}, ${province.name}`,
                district.type || 'district',
                district.slug ||
                  district.name.toLowerCase().replace(/\s+/g, '-'),
                district.name_with_type || district.name,
                `${district.name}, ${province.name}`,
                `${district.name_with_type || district.name}, ${province.name_with_type || province.name}`,
              ],
            );

            // Fetch and insert wards for major districts (limit to avoid rate limits)
            if (
              ['quan', 'huyen', 'thi-xa', 'thanh-pho'].includes(district.type)
            ) {
              try {
                const wardsResponse = await axios.get(
                  `https://provinces.open-api.vn/api/d/${district.code}?depth=2`,
                  { timeout: 3000 },
                );

                const districtWithWards = wardsResponse.data;
                const wards = districtWithWards.wards || [];

                for (const ward of wards.slice(0, 50)) {
                  // Limit wards to avoid too many inserts
                  await queryRunner.query(
                    `
                    INSERT INTO "vietnam_locations" (
                      "province_id", "district_id", "ward_id", "province_name", 
                      "district_name", "ward_name", "full_name", "type", "slug", 
                      "name_with_type", "path", "path_with_type"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT ("province_id", "district_id", "ward_id")
                    DO NOTHING
                  `,
                    [
                      province.code,
                      district.code,
                      ward.code,
                      province.name,
                      district.name,
                      ward.name,
                      `${ward.name}, ${district.name}, ${province.name}`,
                      ward.type || 'ward',
                      ward.slug || ward.name.toLowerCase().replace(/\s+/g, '-'),
                      ward.name_with_type || ward.name,
                      `${ward.name}, ${district.name}, ${province.name}`,
                      `${ward.name_with_type || ward.name}, ${district.name_with_type || district.name}, ${province.name_with_type || province.name}`,
                    ],
                  );
                }
              } catch (wardError) {
                console.log(
                  `Failed to fetch wards for ${district.name}: ${wardError.message}`,
                );
              }
            }
          }
        } catch (districtError: any) {
          console.log(
            `Failed to fetch districts for ${province.name}: ${districtError.message}`,
          );
        }

        // Add delay to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log('Vietnamese administrative divisions seeded successfully');
    } catch (error: any) {
      console.error('Failed to seed Vietnamese provinces:', error.message);
      // Don't fail the migration if API is unavailable
      console.log(
        'Continuing migration without seeding data - data can be seeded later',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vietnam_locations_coordinates"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vietnam_locations_province_name"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "vietnam_locations"`);
  }
}

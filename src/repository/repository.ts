import { Pool } from "pg";

export class Repository {

    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    public async createTable(): Promise<void>{
        await this.pool.query(`
            CREATE SCHEMA IF NOT EXISTS app;
            
            CREATE TABLE IF NOT EXISTS employees(
                id BIGSERIAL PRIMARY KEY,
                last_name TEXT NOT NULL,
                first_name TEXT NOT NULL,
                middle_name TEXT NOT NULL,
                birth_date DATE NOT NULL,
                gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female'))
            );
        `);
    }
}
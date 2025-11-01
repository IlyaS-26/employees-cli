import { Pool } from "pg";

import { Employee } from "../employee/employee.js";

export class Repository {

    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    public async createTable(): Promise<void> {
        await this.pool.query(`
            CREATE SCHEMA IF NOT EXISTS app;
            
            CREATE TABLE IF NOT EXISTS employees(
                id BIGSERIAL PRIMARY KEY,
                last_name TEXT NOT NULL,
                first_name TEXT NOT NULL,
                middle_name TEXT,
                birth_date DATE NOT NULL,
                gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female'))
            );
        `);
    }

    public async insert(employee: Employee): Promise<void> {
        await this.pool.query(`
            INSERT INTO app (
                last_name,
                first_name,
                middle_name,
                birth_date,
                gender)
            ) VALUES (
                ${employee.lastName},
                ${employee.firstName},
                ${employee.middleName},
                ${employee.birthDate},
                ${employee.gender}
            );
        `);
    }
}
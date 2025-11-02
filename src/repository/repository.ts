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
            
            CREATE TABLE IF NOT EXISTS app.employees (
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
        const sql = `
            INSERT INTO app.employees (
                last_name,
                first_name,
                middle_name,
                birth_date,
                gender 
            ) VALUES (
                $1,
                $2,
                $3,
                $4,
                $5
            )
        `;

        const values = [
            employee.lastName,
            employee.firstName,
            employee.middleName,
            employee.birthDate,
            employee.gender
        ];

        await this.pool.query(sql, values);
    }

    /**
     * Сортируем по уникальным ФИО и дате рождения
     * Детерминируем выбор по DESC id при дубликатах
     */
    public async listSortedEmployees(): Promise<void> {
        const { rows } = await this.pool.query(`
            SELECT last_name, first_name, middle_name, 
                TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date,
                gender
            FROM (
                SELECT DISTINCT ON (last_name, first_name, middle_name, birth_date)
                    last_name, first_name, middle_name, birth_date, gender, id
                FROM app.employees
                ORDER BY last_name, first_name, middle_name, birth_date, id DESC
            ) t
            ORDER BY last_name, first_name, middle_name NULLS LAST; 
        `);
        rows.forEach((value) => {
            console.log(`${value.last_name} ${value.first_name} ${value.middle_name ?? ""} ${value.birth_date} ${value.gender} ${Employee.ageFromBirthDate(value.birth_date)}`.replace(/\s+/g, " "));
        });
    }
}
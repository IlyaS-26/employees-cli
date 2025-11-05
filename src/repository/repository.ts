import { Pool } from "pg";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";
import { performance } from "node:perf_hooks";

import { Employee } from "../employee/employee.js";

import type { Buckets, Bucket, EmployeeRaw } from "../types/types.js";

export class Repository {

    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    public async createTable(): Promise<void> {
        try {
            await this.pool.query(`
                CREATE SCHEMA IF NOT EXISTS app;
                
                CREATE TABLE IF NOT EXISTS app.employees (
                    id BIGSERIAL PRIMARY KEY,
                    last_name TEXT NOT NULL,
                    first_name TEXT NOT NULL,
                    middle_name TEXT NOT NULL,
                    birth_date DATE NOT NULL,
                    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female'))
                );
            `);
        } catch (err) {
            throw err;
        }
        try {
            await this.pool.query(`
                CREATE INDEX CONCURRENTLY IF NOT EXISTS employee_male_lastname_idx
                ON app.employees (last_name text_pattern_ops)
                INCLUDE (first_name, middle_name, birth_date)
                WHERE gender = 'Male';
            `);
        } catch (err) {
            throw err;
        }
        console.log("Таблица app.employees успешно создана!");
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

        const values: string[] = [
            employee.employeeRaw.lastName,
            employee.employeeRaw.firstName,
            employee.employeeRaw.middleName,
            employee.employeeRaw.birthDate,
            employee.employeeRaw.gender
        ];
        try {
            await this.pool.query(sql, values);
        } catch (err) {
            throw err;
        }
    }

    public async insertMill(): Promise<void> {
        try {
            const dirname = path.dirname(fileURLToPath(import.meta.url));
            const samplesDir = path.join(dirname, "samples");

            const pathToFirstMiddleNamesFemale = path.join(samplesDir, "first-middle-names-female.txt");
            const pathToFirstMiddleNamesMale = path.join(samplesDir, "first-middle-names-male.txt");
            const pathToLastNames = path.join(samplesDir, "last-names.txt");

            const firstMale: Buckets = new Map();
            const firstFemale: Buckets = new Map();
            const lastNames: Buckets = new Map();

            await this.fillTheBucket(firstMale, pathToFirstMiddleNamesMale);
            firstMale.forEach((value) => {
                this.shuffle(value.items);
            });
            await this.fillTheBucket(firstFemale, pathToFirstMiddleNamesFemale);
            firstFemale.forEach((value) => {
                this.shuffle(value.items);
            });
            await this.fillTheBucket(lastNames, pathToLastNames);
            lastNames.forEach((value) => {
                this.shuffle(value.items);
            });

            let letterIndex: number = 0;
            let letterIndexMiddle: number = 1;
            let genderChoice: number = 0;
            const batch: EmployeeRaw[] = [];

            const BATCH_SIZE = 5_000;
            const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

            for (let i = 0; i < 1_000_000; i++) {

                let gender: "Male" | "Female" = genderChoice === 0 ? "Female" : "Male";
                let firstName: string = "";
                let middleName: string = "";
                let lastName: string = "";

                const maleOrFemaleBracket: Buckets = gender === "Male" ? firstMale : firstFemale;

                const bFirst = maleOrFemaleBracket.get(ALPHABET[letterIndex]!);
                const bMiddle = maleOrFemaleBracket.get(ALPHABET[letterIndexMiddle]!);
                const bLast = lastNames.get(ALPHABET[letterIndex]!);

                if (bFirst && bMiddle && bLast) {

                    let { pointerFirst } = bFirst;
                    let { pointerMiddle } = bMiddle;
                    let { pointerFirst: pointerLast } = bLast;

                    firstName = bFirst.items[pointerFirst]!;
                    bFirst.pointerFirst = (bFirst.pointerFirst + 1) % bFirst.items.length;

                    middleName = bMiddle.items[pointerMiddle]!;
                    bMiddle.pointerMiddle = (bMiddle.pointerMiddle + 1) % bMiddle.items.length;

                    lastName = bLast.items[pointerLast]!;
                    bLast.pointerFirst = (bLast.pointerFirst + 1) % bLast.items.length;
                }

                const employeeRaw: EmployeeRaw = {
                    firstName,
                    middleName,
                    lastName,
                    gender,
                    birthDate: this.randomDate()
                }

                batch.push(employeeRaw);

                if (batch.length === BATCH_SIZE) {
                    await this.batchSend(batch);
                    batch.length = 0;
                }

                letterIndex = (letterIndex + 1) % 26;
                letterIndexMiddle = (letterIndexMiddle + 1) % 26;
                genderChoice = genderChoice === 0 ? 1 : 0;
            }
            console.log("Вставка миллиона объектов прошла успешно!");
        } catch (err) {
            throw err;
        }
    }

    /**
     * Для вставки массива объектов используем multi-insert
     */
    public async batchSend(batch: EmployeeRaw[]): Promise<void> {
        const values: string[] = [];
        const placeholders: string[] = [];

        let place: number = 1;
        for (const raw of batch) {
            placeholders.push(`($${place},$${place + 1},$${place + 2},$${place + 3},$${place + 4})`);
            values.push(
                raw.lastName,
                raw.firstName,
                raw.middleName,
                raw.birthDate,
                raw.gender
            );
            place += 5;
        }

        const sql = `
            INSERT INTO app.employees
                (last_name, first_name, middle_name, birth_date, gender)
            VALUES
                ${placeholders.join(",")}
        `;

        try {
            await this.pool.query(sql, values);
        } catch (err) {
            throw err;
        }
    }

    /**
      * Сортируем по уникальным ФИО и дате рождения
      * Детерминируем выбор по DESC id при дубликатах
      */
    public async listSortedEmployees(): Promise<void> {
        try {
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
                ORDER BY last_name, first_name, middle_name; 
            `);

            rows.forEach((value) => {
                console.log(`${value.last_name} ${value.first_name} ${value.middle_name} ${value.birth_date} ${value.gender} ${Employee.ageFromBirthDate(value.birth_date)}`);
            });
        } catch (err) {
            throw err;
        }
    }

    public async listMale(): Promise<void> {
        try {
            const start = performance.now();

            const { rows } = await this.pool.query(` 
                SELECT last_name, first_name, middle_name, 
                    TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date,
                    gender
                FROM app.employees
                WHERE gender = 'Male' AND last_name LIKE 'F%'
            `);

            const end = performance.now();

            rows.forEach((value) => {
                console.log(`${value.last_name} ${value.first_name} ${value.middle_name} ${value.birth_date} ${value.gender}`);
            });

            const elapsed = end - start;
            console.log(`\nВремя выполенения запроса: ${elapsed.toFixed(4)} мс`);
        } catch (err) {
            throw err;
        }
    }

    private async fillTheBucket(bucket: Buckets, path: string): Promise<void> {
        try {
            const reader = fs.createReadStream(path);
            const readLine = readline.createInterface({
                input: reader,
                crlfDelay: Infinity
            });

            reader.on("error", (err) => readLine.close());
            readLine.on("error", (err) => reader.destroy(err));

            for await (const line of readLine) {
                const name: string = line.trim();
                if (!name) continue;

                const letter: string = name[0]!.toUpperCase();

                if (!bucket.has(letter)) {
                    const newBucket: Bucket = {
                        items: [],
                        pointerFirst: 0,
                        pointerMiddle: 0
                    };
                    bucket.set(letter, newBucket);
                }

                const b = bucket.get(letter);
                b?.items.push(name);
            }
        } catch (err) {
            throw err;
        }
    }

    private shuffle(arr: string[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j]!, arr[i]!];
        }
    }

    private randomDate(start: string = "1955-01-01", end: string = "2007-12-31"): string {
        const [startYear, startMonth, startDay] = start.split("-").map(Number) as [number, number, number];
        const [endYear, endMonth, endDay] = end.split("-").map(Number) as [number, number, number];

        const startUTC = Date.UTC(startYear, startMonth - 1, startDay);
        const endUTC = Date.UTC(endYear, endMonth - 1, endDay);

        const DAY = 24 * 60 * 60 * 1000;
        const totalDays = Math.floor((endUTC - startUTC) / DAY) + 1;

        const offsetDays = Math.floor(Math.random() * totalDays);
        const date = new Date(startUTC + offsetDays * DAY);

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }
}
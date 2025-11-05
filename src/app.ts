import { Pool } from "pg";
import "dotenv/config";

import { Repository } from "./repository/repository.js";
import { Employee } from "./employee/employee.js";

async function main() {

    const [, , mode, ...args] = process.argv;

    if (!mode) {
        console.error("Использование: myApp <режим> [аргументы]?");
        process.exit(1);
    }

    const pool = new Pool({
        user: process.env.PGUSER ?? "postgres",
        host: process.env.PGHOST ?? "localhost",
        database: process.env.PGDATABASE ?? "postgres",
        password: process.env.PGPASSWORD ?? "postgres",
        port: Number(process.env.PGPORT) ?? 5432
    });
    const repository = new Repository(pool);

    try {
        switch (mode) {

            case "1": {
                if (args.length > 0) {
                    console.error("Данный режим не должен иметь аргументы");
                    return;
                }
                await repository.createTable();
                break;
            }

            case "2": {

                if (args.length < 3) {
                    console.error(`Нужный формат аргументов: "ФИО" YYYY-MM-DD Male|Female`);
                    return;
                }

                const gender = args.at(-1) as "Male" | "Female";
                const birthDate = args.at(-2)!;

                const fullName = args.slice(0, -2).join(" ").replace(/"/g, "").trim();
                const parts = fullName.split(/\s+/);

                if (parts.length !== 3) {
                    console.error("ФИО должно состоять из трех слов");
                    return;
                }

                const [lastName, firstName, middleName] = parts as [string, string, string];

                const nameRegex = /^[A-Z][a-z]+$/;

                if (!nameRegex.test(lastName)) {
                    console.error("Фамилия должна начинаться с заглавной буквы и состоять только из латинского алфавита");
                    return;
                }
                if (!nameRegex.test(firstName)) {
                    console.error("Имя должно начинаться с заглавной буквы и состоять только из латинского алфавита");
                    return;

                }
                if (!nameRegex.test(middleName)) {
                    console.error("Отчество должно начинаться с заглавной буквы и состоять только из латинского алфавита");
                    return;
                }

                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(birthDate)) {
                    console.error("Дата не соответствует формату YYYY-MM-DD");
                    return;
                }
                const tryDate = new Date(birthDate);
                if (Number.isNaN(tryDate.getTime())) {
                    console.error("Такой даты не существует");
                    return;
                }

                if (gender !== "Male" && gender !== "Female") {
                    console.error("Пол может быть только Male или Female");
                    return;
                }

                const employee: Employee = new Employee(repository, firstName, middleName, lastName, birthDate, gender);
                await employee.saveToRepo();
                break;
            }

            case "3": {
                if (args.length > 0) {
                    console.error("Данный режим не должен иметь аргументы");
                    return;
                }
                await repository.listSortedEmployees();
                break;
            }

            case "4": {
                if (args.length > 0) {
                    console.error("Данный режим не должен иметь аргументы");
                    return;
                }
                await repository.insertMill();
                break;
            }

            case "5": {
                if (args.length > 0) {
                    console.error("Данный режим не должен иметь аргументы");
                    return;
                }
                await repository.listMale();
                break;
            }

            default: {
                console.error("Неизвестный режим");
                return;
            }
        }
    } catch (err) {
        console.error("Ошибка:", err);
        return;
    } finally {
        await pool.end();
    }
}

await main();
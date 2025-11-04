import { Pool } from "pg";
import "dotenv/config";

import { Repository } from "./repository/repository.js";
import { Employee } from "./employee/employee.js";

async function main() {
    const pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: Number(process.env.PGPORT)
    });

    const repository = new Repository(pool);
    const employee = new Employee(repository, "Dima", "Korablev", "Alexeevich", "2000-03-15", "Male");

    await repository.createTable();
    await repository.insertMill();
    await repository.listSortedEmployees();
}

await main();

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
    const employee = new Employee(repository, "Ilya", "Olyashev", "Leshenko", "2009-07-12", "Male");
    await repository.createTable();
    console.log(employee.ageFromBirthDate());
    await employee.saveToRepo();
}

await main();

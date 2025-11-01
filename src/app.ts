import { Pool } from "pg";
import "dotenv/config";

import { Repository } from "./repository/repository.js";

async function main() {
    const pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: Number(process.env.PGPORT)
    });

    const repository = new Repository(pool);
    await repository.createTable();
}

await main();

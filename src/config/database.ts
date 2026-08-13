import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import {relations} from '../models/relations.js';
import {Pool} from 'pg';


const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: pool, relations });

export { db, sql};
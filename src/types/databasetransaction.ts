import { db } from '../config/database.js';

export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
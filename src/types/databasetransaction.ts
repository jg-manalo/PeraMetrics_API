import { db } from '../config/database';

export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
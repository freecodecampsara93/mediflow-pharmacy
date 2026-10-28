import './testEnv';
import { createApp } from '../src/app';
import { pool } from '../src/config/db';

export const app = createApp();
export { pool as testPool };

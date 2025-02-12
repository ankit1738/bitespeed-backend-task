import {Pool} from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DATABASE,
  password: process.env.DB_PASSWORD, 
  port: Number(process.env.DB_PORT),
  ssl: true
});

export default {
  query: (text:string, params?:any[]) => pool.query(text, params),
};

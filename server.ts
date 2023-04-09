import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import StocksRouter from './router';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;

app.use(StocksRouter)

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
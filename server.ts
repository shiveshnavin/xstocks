import express, { Express, Request, Response } from 'express';
import StocksRouter from './router';

const app: Express = express();
const port = process.env.PORT || 8888;

app.use(StocksRouter)
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
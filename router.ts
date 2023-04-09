import path from 'path';
import express, { Express, Request, Response } from 'express';

const StocksRouter = express.Router()
StocksRouter.use(express.static(path.join(__dirname, './public')))

StocksRouter.post('/zerodha/login', (req, res) => {

})

export default StocksRouter

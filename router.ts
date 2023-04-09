import path from 'path';
import express, { Express, Request, Response } from 'express';
import fs from 'fs'
import { Utils } from './common-utils';
import ZerodhaLogin from './zerodha/login'
import Zerodha from './zerodha/zerodha'
import { GetInputAsync } from './common-utils';
import { ScipSearcher } from './zerodha/ScipSearcher'
import bodyparser from 'body-parser'

const StocksRouter = express.Router()

StocksRouter.use(bodyparser.json())
StocksRouter.use(express.static(path.join(__dirname, './public')))

StocksRouter.all('/zerodha/login', async (req, res) => {

    let userId = req.headers['userid'] || req.body?.userid || req.query.userid
    if (!userId) {
        return res.status(401).send({
            message: 'Must provide `userid` either in url/body/headers'
        })
    }
    let credsPath = path.join(__dirname, `./common-creds/xstocks/zerodha/${userId.toLowerCase()}.json`)
    let creds: any = Utils.readFileToObject(credsPath)
    if (!creds) {
        creds = {
            "userid": Utils.getFieldFromRequest(req, "userid"),
            "password": Utils.getFieldFromRequest(req, "password"),
            "totp_key": Utils.getFieldFromRequest(req, "userid")
        }
    }
    if (!creds.userid || !creds.password) {
        return res.status(401).send({
            message: 'User not onboarded. Must provide `userid` and `password` either in url/body/headers'
        })
    }

    let zerodha: any = Zerodha(creds)
    let loginData = await zerodha.init()
    res.send(loginData)
})

function getZerodhaInstance(req: any) {
    let loginData = {
        enctoken: Utils.getFieldFromRequest(req, 'enctoken'),
        kf_session: Utils.getFieldFromRequest(req, 'kf_session'),
        public_token: Utils.getFieldFromRequest(req, 'public_token'),
        id: Utils.getFieldFromRequest(req, 'id') || Utils.getFieldFromRequest(req, 'userid')
    }

    if (!(loginData.enctoken && loginData.kf_session && loginData.public_token && loginData.id)) {
        return undefined
    }
    let zerodha = Zerodha(loginData)
    zerodha.init(loginData)
    return zerodha
}

StocksRouter.get('/findscip', (req, res) => {
    let symbols: any = ScipSearcher.searchScipBySymbol(Utils.getFieldFromRequest(req, 'scip'))
    if (!symbols || symbols.length == 0) {
        return res.send(404)
    }
    else {
        res.send(symbols)
    }
})

StocksRouter.get('/zerodha/profile', async (req, res) => {

    try {
        let zerodha = getZerodhaInstance(req);
        if (zerodha) {
            let profile = await zerodha.getProfile();
            res.send(profile)
        }
        else {
            return res.status(401).send({
                message: 'Login required'
            })
        }
    } catch (e: any) {
        res.status(500).send({
            message: e.message
        })
    }
})

export default StocksRouter

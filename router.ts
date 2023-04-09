import path from 'path';
import express, { Express, Request, Response } from 'express';
import fs from 'fs'
import { Utils } from './common-utils';
import ZerodhaLogin from './zerodha/login'
import { GetInputAsync } from './common-utils';
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
            "totp_secret": Utils.getFieldFromRequest(req, "userid")
        }
    }
    if (!creds.userid || !creds.password) {
        return res.status(401).send({
            message: 'User not onboarded. Must provide `userid` and `password` either in url/body/headers'
        })
    }

    let loginResult = ZerodhaLogin(creds.userid, creds.password, creds.totp_secret, () => { }, async () => {
        let otp = await GetInputAsync('totp_' + creds.userid)
        return otp
    })

})

export default StocksRouter

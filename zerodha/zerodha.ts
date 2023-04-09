//@ts-nocheck
let moment = require('moment')
import fetch from 'node-fetch-commonjs';
import zlogin from './login';
import { Tick } from 'common-utils';
import authenticator from 'authenticator'
import axios from 'axios'
import { Utils } from 'common-utils';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
function readOTPFrom2FA(totpKey) {
    const token = Utils.generateOTPFromKey(totpKey)
    console.log('Generated TOTP', token)
    return token
}

let KiteTicker = require('./ticker')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})


function wrap(fetchPromise) {
    return new Promise((resolve, reject) => {
        fetchPromise
            .then(res => res.json())
            .then(json => {
                if (!json.data) {
                    return resolve(json)
                }
                resolve(json.data)
            })
            .catch(err => {
                reject(err)
            });
    })
}
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
let masterSymbolList = require('./scrips_full.json')


const Zerodha = function (zerodhaConfig, log?) {
    if (!log) {
        log = console.log
    }

    let mod = {};

    let Z_USERID = zerodhaConfig.userid || process.env.Z_USERID
    let Z_PASSWORD = zerodhaConfig.password || process.env.Z_PASSWORD
    let Z_TOTP_KEY = zerodhaConfig.totp_key || process.env.Z_TOTP_KEY
    let getPin = zerodhaConfig.getPin || (async (user, ky) => {
        return readOTPFrom2FA(ky)
    })
    let getOtp = zerodhaConfig.getOTP || (() => {
        return process.env.Z_TOTP_KEY
    })

    let enctoken = ""
    let kf_session = ""
    let public_token = ""

    let isKill = false;


    async function zerodhaCall(method, url, data) {
        var config = {
            method: method,
            url: url,
            headers: {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                "authorization": `enctoken ${enctoken}`,
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-kite-userid": "AMC939",
                "x-kite-version": "2.9.10",
                "cookie": `kf_session=${kf_session}; user_id=${Z_USERID}; enctoken=${enctoken}`,
                "Referer": "https://kite.zerodha.com/dashboard",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "x-csrftoken": public_token
            },
            data: data
        };

        try {
            let result = await axios(config);
            return result.data.data;

        } catch (e) {
            // log('Zerodha ERROR', e.response.data.message)
            throw e;
        }
    }

    mod.zerodhaCall = zerodhaCall;

    mod.init = async function (existingLogin) {
        log('========================')
        let loginData;
        if (existingLogin) {
            loginData = existingLogin
        }
        else {
            loginData = await zlogin(Z_USERID, Z_PASSWORD, Z_TOTP_KEY, getPin, getOtp)

        }
        loginData.id = Z_USERID
        enctoken = loginData.enctoken;
        kf_session = loginData.kf_session;
        public_token = loginData.public_token;
        return loginData
    }

    mod.getProfile = async function () {
        return (zerodhaCall('get', 'https://kite.zerodha.com/oms/user/profile/full'))
    }

    /**
     * 
     * @param {*} ticker {tradingsymbol OR name,"expiry":"2022-03-31","instrument_type":"CE",strike,"segment":"NFO-OPT","exchange":"NFO"}
     */
    mod.findScrip = function (ticker) {
        for (let j = 0; j < masterSymbolList.length; j++) {
            const symbol = masterSymbolList[j];
            if (ticker.tradingsymbol == symbol.tradingsymbol) {
                if (
                    ticker.segment == symbol.segment &&
                    ticker.exchange == symbol.exchange) {
                    return symbol
                }
            }
            else if (
                ticker.tradingsymbol == undefined &&
                ticker.segment == symbol.segment &&
                ticker.instrument_type == symbol.instrument_type &&
                ticker.expiry == symbol.expiry &&
                ticker.strike == symbol.strike &&
                ticker.exchange == symbol.exchange
            ) {
                return symbol
            }
        }
    }


    mod.listen = async function (symbols, onTick) {

        // log('Starting market watch of', symbols)
        if (!masterSymbolList) {
            return log('Fatal failure while retrieving watchlist')
        }

        let instrument_tokens = [];
        for (let index = 0; index < masterSymbolList.length; index++) {
            const element = masterSymbolList[index];
            if (symbols) {

                for (let j = 0; j < symbols.length; j++) {
                    const symbol = symbols[j];
                    if (element.tradingsymbol == symbol) {
                        instrument_tokens.push(parseInt(element.instrument_token))
                        break;
                    }
                }
            }
            else {
                instrument_tokens.push(parseInt(element.instrument_token))
            }
        }

        if (instrument_tokens.length == 0) {
            log('Fatal ! none of', symbols, 'is present in your zerodha watchlist 1 . Please Add')
        }

        let wsUrl = `wss://ws.zerodha.com/?api_key=kitefront&user_id=${Z_USERID}&enctoken=${encodeURIComponent(enctoken)}&uid=${(new Date().getTime().toString())}&user-agent=kite3-web&version=2.9.10`

        let ticker = new KiteTicker(({
            root: wsUrl
        }));

        ticker.on("ticks", onTicks);
        ticker.on("connect", subscribe);
        ticker.connect();

        function onTicks(ticks) {
            if (isKill) {
                ticker.autoReconnect(false, 0, 1)
                ticker.disconnect()
            }
            if (onTick) {
                onTick(ticks, ticker)
            }
        }
        function subscribe() {
            var items = instrument_tokens;
            ticker.subscribe(items);
            ticker.setMode(ticker.modeFull, items);
        }

        return ticker;

    }

    mod.createTicker = function () {
        let wsUrl = `wss://ws.zerodha.com/?api_key=kitefront&user_id=${Z_USERID}&enctoken=${encodeURIComponent(enctoken)}&uid=${(new Date().getTime().toString())}&user-agent=kite3-web&version=2.9.10`

        let ticker = new KiteTicker(({
            root: wsUrl
        }));

        return ticker;
    }
    /**
     * 
     * @param {*} instrumentToken 
     * @param {*} interval minute · day · 3minute · 5minute · 10minute · 15minute · 30minute · 60minute
     * @param {*} from yyyy-mm-dd hh:mm:ss 2015-12-28+09:30:00
     * @param {*} to yyyy-mm-dd hh:mm:ss 2015-12-28+09:30:00
     * @returns 
     */
    mod.getHistoricalData = async function getHistoricalData(stockData, interval, from, to, continuous, flat) {

        let response = await wrap(fetch(`https://kite.zerodha.com/oms/instruments/historical/${stockData.instrument_token}/${interval}?user_id=AMC939&oi=1&continuous=${continuous ? 1 : 0}&from=${from}&to=${to}`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                "authorization": "enctoken " + enctoken,
                "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "x-csrftoken": public_token,
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "cookie": `kf_session=${kf_session}; user_id=${Z_USERID}; enctoken=${enctoken}`,
            },
            "referrer": "https://kite.zerodha.com/chart/web/tvc/NSE/SBILIFE/5582849",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        }));

        let ticks = []
        if (response.candles) {
            response.candles.forEach(element => {
                ticks.push(new Tick({
                    symbol: stockData.tradingsymbol,
                    stockData: flat ? undefined : stockData,
                    close: element[4],
                    datetime: element[0],
                    high: element[2],
                    low: element[3],
                    open: element[1],
                    volume: element[5],
                    oi: element[6],
                }))
            });
        }

        return ticks;
    }

    /**
     * 
     * @param {*} limitPrice 
     * @param {*} qty 
     * @param {*} type BUY or SELL
     * @param {*} symbol 
     * @returns 
     */
    mod.order = async function (limitPrice, qty, type, symbol, order_type, trade = "NRML", exchange = "NSE") {
        var data = `variety=regular&exchange=${exchange}&tradingsymbol=${symbol}&transaction_type=${type}&order_type=${order_type}&quantity=${qty}&price=${limitPrice}&product=${trade}&validity=DAY&disclosed_quantity=0&trigger_price=0&squareoff=0&stoploss=0&trailing_stoploss=0&user_id=${Z_USERID}`

        try {

            let result = await zerodhaCall('post', 'https://kite.zerodha.com/oms/orders/regular', data);
            result.ok = true;
            return result;
        } catch (e) {
            let ms = e.response ? e.response.data.message : e.message
            log(new Date(), 'Couldnt place order >>', ms)
            return {
                message: ms,
                ok: false
            }
        }
    }
    mod.getMargins = async function () {

        let marginData = await zerodhaCall('get', "https://kite.zerodha.com/oms/user/margins")
        return marginData.equity;
    }

    mod.waitTillOrderIsOpen = async function (orderId, type) {
        log('Waiting for order', type, orderId, 'to reach OPEN or REJECTED state')

        return new Promise(async (resolve, reject) => {

            async function callMyself() {

                if (isKill) {
                    return;
                }
                let orders = await wrap(fetch("https://kite.zerodha.com/oms/orders", {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                        "authorization": "enctoken " + enctoken,
                        "if-none-match": "W/\"5tkudQ119aB023AJ\"",
                        "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Windows\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "x-kite-version": "2.9.10"
                    },
                    "referrer": "https://kite.zerodha.com/orders",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                }))

                for (let index = 0; index < orders.length; index++) {
                    const order = orders[index];
                    if (order.order_id == orderId) {
                        if (order.status == "OPEN" || order.status == "COMPLETE") {
                            log('Order', orderId, 'is now OPEN. @', order.average_price || order.price)
                            resolve(1)
                        }
                        else if (order.status == "REJECTED" || order.status == "CANCELLED") {
                            log('Order', orderId, 'rejected.', order.status_message)
                            resolve(-1)
                        }
                        else {
                            await delay(5000)
                            callMyself()
                        }
                    }
                }
            }
            callMyself()
        })
    }

    mod.waitTillOrderIsExecuted = async function (orderId, type) {
        log('Waiting for order', type, orderId, 'to reach COMPLETE | CANCELLED state')

        return new Promise(async (resolve, reject) => {

            async function callMyself() {

                if (isKill) {
                    return;
                }
                let orders = await wrap(fetch("https://kite.zerodha.com/oms/orders", {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                        "authorization": "enctoken " + enctoken,
                        "if-none-match": "W/\"5tkudQ119aB023AJ\"",
                        "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Windows\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "x-kite-version": "2.9.10"
                    },
                    "referrer": "https://kite.zerodha.com/orders",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                }))

                for (let index = 0; index < orders.length; index++) {
                    const order = orders[index];
                    if (order.order_id == orderId) {
                        if (order.status == "COMPLETE") {
                            log('Order', orderId, 'is now COMPLETE. actual average_price @', order.average_price)
                            order.ok = true;
                            resolve(order)
                        }
                        else if (order.status == "CANCELLED") {
                            log('Order', orderId, 'rejected.', order.status_message)
                            order.ok = false;
                            resolve(order)
                        }
                        else {
                            await delay(5000)
                            callMyself()
                        }
                    }
                }
            }
            callMyself()
        })
    }


    mod.checkIfAnyOrderIsPlacedAlready = async function (type) {
        log('Waiting for an order', type, 'to reach OPEN | COMPLETE state')

        return new Promise(async (resolve, reject) => {

            async function callMyself() {

                if (isKill) {
                    return;
                }
                let orders = await wrap(fetch("https://kite.zerodha.com/oms/orders", {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                        "authorization": "enctoken " + enctoken,
                        "if-none-match": "W/\"5tkudQ119aB023AJ\"",
                        "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Windows\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "x-kite-version": "2.9.10"
                    },
                    "referrer": "https://kite.zerodha.com/orders",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                }))

                for (let index = 0; index < orders.length; index++) {
                    const order = orders[index];
                    if (order.transaction_type == type && (order.status == "COMPLETE" || order.status == "OPEN")) {
                        log('Order', order.transaction_type, order.order_id, 'is now COMPLETE|OPEN. actual average_price @', order.average_price)
                        order.ok = true;
                        resolve(order)
                    }
                }
                resolve({ ok: false })
            }
            callMyself()
        })
    }


    mod.zerodhaRequiredMargin = async function (limitPrice, qty, type, symbol) {

        return new Promise((resolve, reject) => {

            fetch("https://kite.zerodha.com/oms/margins/orders", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "authorization": "enctoken " + enctoken,
                    "content-type": "application/json",
                    "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-kite-version": "2.9.10"
                },
                "referrer": "https://kite.zerodha.com/dashboard",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": `[{\"exchange\":\"NSE\",\"tradingsymbol\":\"${symbol}\",\"transaction_type\":\"${type}\",\"variety\":\"regular\",\"product\":\"${trade}\",\"order_type\":\"LIMIT\",\"quantity\":${qty},\"price\":${limitPrice}}]`,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            })
                .then(res => res.json())
                .then(json => {
                    resolve(json.data[0])
                })
                .catch(err => {
                    reject(err)
                });
        })

    }

    return mod;
}

export default Zerodha
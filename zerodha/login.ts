//@ts-nocheck
import fetch from 'node-fetch';
function wrap(fetchPromise, isRaw) {
    return new Promise((resolve, reject) => {
        fetchPromise
            .then(async (res) => {
                let hea = res.headers
                let ress = isRaw ? { body: await res.text() } : await res.json()
                ress.headers = hea;
                return ress;
            })
            .then(json => {
                if (!json.data) {
                    return resolve(json)
                }
                json.data.headers = json.headers;
                resolve(json.data)
            })
            .catch(err => {
                reject(err)
            });
    })
}
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;

    cookieHeader.split(`;`).forEach(function (cookie) {
        let [name, ...rest] = cookie.split(`=`);
        name = name.trim();
        if (!name) return;
        const value = rest.join(`=`).trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });

    return list;
}

async function login(userId, password, Z_TOTP_KEY, getPin, getOTP) {
    console.log('Logging in to', userId)

    let home = await wrap(fetch("https://kite.zerodha.com/", {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-GB,en;q=0.9",
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
        },
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET"
    }), true)

    let homeheaderSetCok = home.headers.get('set-cookie')
    let kf_session = parseCookies(homeheaderSetCok)["kf_session"]


    let res = await wrap(fetch("https://kite.zerodha.com/api/login", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-kite-userid": userId,
            "x-kite-version": "2.9.10",
            "cookie": "_ga=GA1.2.494953855.1641359787; _gid=GA1.2.397832564.1641359787; public_token=null; kf_session=" + kf_session,
            "Referer": "https://kite.zerodha.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": `user_id=${userId}&password=${encodeURIComponent(password)}`,
        "method": "POST"
    }));

    let request_id = res.request_id;

    let tw2 = await loginWith2fa(userId, kf_session, request_id, Z_TOTP_KEY, getPin, getOTP)
    let headerSetCok = tw2.headers.get('set-cookie')
    headerSetCok = headerSetCok.replace('SameSite=None,', "")
    headerSetCok = headerSetCok.replace('SameSite=None,', "")
    headerSetCok = headerSetCok.replace('SameSite=None,', "")
    let encToken = parseCookies(headerSetCok)["enctoken"]
    let public_token = parseCookies(headerSetCok)['public_token']
    console.log('Zerodha login complete')
    return {
        enctoken: encToken,
        kf_session: kf_session,
        public_token: public_token
    };
}

async function loginWith2fa(userId, kf_session, request_id, Z_TOTP_KEY, getPin, getOTP) {
    let pin;
    let pinType;
    if (getPin) {
        pinType = 'app_code'
        pin = await getPin(userId, Z_TOTP_KEY)
    }
    else if (getOTP) {
        pinType = 'sms'
        let otpUrl = 'https://kite.zerodha.com/oms/trusted/kitefront/user/AMC939/twofa/generate_otp'

        let otpRes = await wrap(fetch(otpUrl, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Microsoft Edge\";v=\"97\", \"Chromium\";v=\"97\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-csrftoken": "52lDwPxv8mA59GlUTCkHAbTcqjARPeuj",
                "x-kite-userid": userId,
                "x-kite-version": "2.9.10",
                "cookie": "public_token=null; kf_session=" + kf_session,
                "Referer": "https://kite.zerodha.com/",
                "origin": "https://kite.zerodha.com",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": "user_id=" + userId + "&request_id=" + request_id + "&twofa_value=" + pin + "&twofa_type" + pinType + "&skip_session=",
            "method": "POST"
        }))
        pin = await getOTP(userId)

    }

    let tw2 = await wrap(fetch("https://kite.zerodha.com/api/twofa", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Microsoft Edge\";v=\"97\", \"Chromium\";v=\"97\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-csrftoken": "52lDwPxv8mA59GlUTCkHAbTcqjARPeuj",
            "x-kite-userid": userId,
            "x-kite-version": "2.9.10",
            "cookie": "public_token=null; kf_session=" + kf_session,
            "Referer": "https://kite.zerodha.com/",
            "origin": "https://kite.zerodha.com",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "user_id=" + userId + "&request_id=" + request_id + "&twofa_value=" + pin + "&twofa_type" + pinType + "&skip_session=",
        "method": "POST"
    }))

    return tw2
}

export default login
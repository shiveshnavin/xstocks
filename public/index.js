document.addEventListener('DOMContentLoaded', function () {
    getProfile();
});

function getHost() {
    return ""
}

function setLocalStorageItem(key, value) {
    localStorage.setItem(key, value);
}

function getLocalStorageItem(key) {
    return localStorage.getItem(key);
}

function addError(errMsg, error) {
    console.error(error);
}


function getHeaders() {
    let loginData = getLocalStorageItem('login_data')
    if (!loginData) {
        return {}
    }
    return JSON.parse(loginData)
}

function getProfile() {
    axios.get(getHost() + `/zerodha/profile`, {
        headers: getHeaders()
    })
        .then(response => {
            console.log(response.data)
            if (response?.data?.user_name)
                document.getElementById("welcomUser").innerText = 'Welcome ' + response?.data?.user_name + ' '
        })
        .catch(error => {
            addError(error.message)
        });
}

function login() {
    axios.get(getHost() + `/zerodha/login?userid=AMC939`)
        .then(response => {
            if (response.data) {
                setLocalStorageItem('login_data', JSON.stringify(response.data))

                Object.keys(response.data)
                    .forEach(key => {
                        setLocalStorageItem(key, response.data[key])
                    })
            }
        })
        .catch(error => {
            addError(error.message)
        });
}

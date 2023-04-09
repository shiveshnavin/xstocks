document.addEventListener('DOMContentLoaded', function () {
    getProfile();
    initializeScipFinder()
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
            if (response?.data?.user_name) {
                document.getElementById("welcomUser").innerText = 'Welcome ' + response?.data?.user_name + ' '
                getProfile()
            }
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



function initializeScipFinder() {
    const input = document.getElementById('stockName');
    const dataList = document.getElementById('scips');

    // Listen to input events on the text input
    input.addEventListener('input', async function () {
        // Call the API with the stockName query parameter
        const response = await axios.get('/findscip', {
            params: {
                scip: input.value,
            },
        });

        // Clear the previous dropdown options
        dataList.innerHTML = '';

        // Create new dropdown options for each tradingsymbol in the response
        response.data.forEach((scip) => {
            const option = document.createElement('option');
            option.value = scip.tradingsymbol;
            dataList.appendChild(option);
        });
    });

    // Listen to selection events on the dropdown
    dataList.addEventListener('change', function () {
        // Set the input value to the selected option
        input.value = dataList.value;

        // Call the initialize() function with the selected tradingsymbol
        initialize(dataList.value);
    });
}
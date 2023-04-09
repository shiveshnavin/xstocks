document.addEventListener('DOMContentLoaded', function () {
    getProfile();
    initializeScipFinder()
    renderSelectedItems()
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
                getProfile()

            }
        })
        .catch(error => {
            addError(error.message)
        });
}



var selectedItems = [];

function initializeScipFinder() {

    const input = document.getElementById('stockName');
    const suggestionsList = document.getElementById("suggestions");
    if (getLocalStorageItem('scip')) {
        input.value = getLocalStorageItem('scip')
    }

    // Listen to input events on the text input
    input.addEventListener('input', async function () {
        // Call the API with the stockName query parameter
        const response = await axios.get('/findscip', {
            params: {
                scip: input.value,
            },
        });

        // Clear the previous dropdown options
        suggestionsList.innerHTML = "";

        // Create new dropdown options for each tradingsymbol in the response
        response.data.forEach((item) => {
            const suggestion = document.createElement("li");
            suggestion.textContent = item?.tradingsymbol;
            suggestionsList.appendChild(suggestion);


            suggestion.addEventListener("click", () => {
                input.value = item?.tradingsymbol;
                setLocalStorageItem('scip', input.value)
                suggestionsList.innerHTML = "";
                addSelectedItem(item?.tradingsymbol);

            });
        });
    });
}


function addSelectedItem(item) {
    if (!selectedItems.some((selectedItem) => selectedItem.tradingsymbol === item)) {
        selectedItems.push({ tradingsymbol: item, enabled: true });
        renderSelectedItems();
    }
}

function removeSelectedItem(item) {
    const index = selectedItems.findIndex((selectedItem) => selectedItem.tradingsymbol === item);
    if (index >= 0) {
        selectedItems.splice(index, 1);
        renderSelectedItems();
    }
}

function toggleSelectedItem(item) {
    const selectedItem = selectedItems.find((selectedItem) => selectedItem.tradingsymbol === item);
    if (selectedItem) {
        selectedItem.enabled = !selectedItem.enabled;
        renderSelectedItems();
    }
}

function renderSelectedItems() {
    if (selectedItems && selectedItems.length > 0)
        setLocalStorageItem('selected_scips', JSON.stringify(selectedItems))
    if (getLocalStorageItem('selected_scips')) {
        let str = getLocalStorageItem('selected_scips')
        selectedItems = JSON.parse(getLocalStorageItem('selected_scips'))
    }



    const selectedItemsList = document.getElementById("selected-items");
    selectedItemsList.innerHTML = ''

    selectedItems.forEach((selectedItem) => {
        const item = document.createElement("li");
        item.classList.add("selected-item");
        item.textContent = selectedItem.tradingsymbol;

        const buttons = document.createElement("div");
        buttons.classList.add("buttons");

        const toggleButton = document.createElement("span");
        toggleButton.classList.add("action", "show-hide");
        toggleButton.style.color = selectedItem.enabled ? "#00f" : "#f00";
        toggleButton.textContent = selectedItem.enabled ? "SHOW" : "HIDE";
        toggleButton.addEventListener("click", () => {
            toggleSelectedItem(selectedItem.tradingsymbol);
            renderSelectedItems()
        });
        buttons.appendChild(toggleButton);

        const deleteButton = document.createElement("span");
        deleteButton.classList.add("action", "delete");
        deleteButton.style.color = "#f00";
        deleteButton.textContent = "DELETE";
        deleteButton.addEventListener("click", () => {
            removeSelectedItem(selectedItem.tradingsymbol);
            renderSelectedItems()
        });
        buttons.appendChild(deleteButton);

        item.appendChild(buttons);

        selectedItemsList.appendChild(item);
    });

}
document.addEventListener('DOMContentLoaded', function () {
    getProfile();
    initializeScipFinder()
    renderSelectedItems()
    loadInputValue('date', "toDate")
    loadInputValue('date', "fromDate")
    loadInputValue('select', 'normalization')
    loadInputValue('select', 'interval')
    refreshGraph()
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

function addError(error) {
    let errMsg = error?.message
    if (error?.response?.data?.message) {
        errMsg = error?.response?.data?.message
    }
    if (errMsg) {
        document.getElementById("error").innerText = errMsg
    }
    else {
        document.getElementById("error").innerText = ""
    }
    if (error)
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
                addError(undefined)
                document.getElementById("welcomUser").innerText = 'Welcome ' + response?.data?.user_name + ' '
            }
        })
        .catch(error => {
            addError(error)
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
            addError(error)
        });
}



var selectedScips = [];

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
    if (!selectedScips.some((selectedItem) => selectedItem.tradingsymbol === item)) {
        selectedScips.push({ tradingsymbol: item, enabled: true });
        renderSelectedItems();
    }
}

function removeSelectedItem(item) {
    const index = selectedScips.findIndex((selectedItem) => selectedItem.tradingsymbol === item);
    if (index >= 0) {
        selectedScips.splice(index, 1);
        renderSelectedItems();
    }
}

function toggleSelectedItem(item) {
    const selectedItem = selectedScips.find((selectedItem) => selectedItem.tradingsymbol === item);
    if (selectedItem) {
        selectedItem.enabled = !selectedItem.enabled;
        renderSelectedItems();
    }
}

function renderSelectedItems() {
    if (selectedScips && selectedScips.length > 0)
        setLocalStorageItem('selected_scips', JSON.stringify(selectedScips))
    if (getLocalStorageItem('selected_scips')) {
        let str = getLocalStorageItem('selected_scips')
        selectedScips = JSON.parse(getLocalStorageItem('selected_scips'))
    }



    const selectedItemsList = document.getElementById("selected-items");
    selectedItemsList.innerHTML = ''

    selectedScips.forEach((selectedItem) => {
        const item = document.createElement("li");
        item.classList.add("selected-item");
        item.textContent = selectedItem.tradingsymbol;

        const buttons = document.createElement("div");
        buttons.classList.add("buttons");

        const toggleButton = document.createElement("span");
        toggleButton.classList.add("action", "show-hide");
        toggleButton.style.color = selectedItem.enabled ? "#FF9800" : "#4CAF50";
        toggleButton.textContent = selectedItem.enabled ? "HIDE" : "SHOW";
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

function refreshGraph() {
    let body = {
        scips: selectedScips?.filter(sc => {
            return sc.enabled
        }).map(sc => {
            return sc.tradingsymbol
        }).join(","),
        from: getTimeStampFromPickerById("fromDate"),
        to: getTimeStampFromPickerById("toDate"),
        interval: getSelectedOptionValue('interval')
    }

    axios.post(getHost() + `/history`, body, {
        headers: getHeaders(),
    })
        .then(response => {
            addError(undefined)
            // console.log(response.data)
            plotGraph(response.data)
        })
        .catch(error => {
            addError(error)
        });
}

function getSelectedOptionValue(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    setLocalStorageItem("select_" + dropdownId, dropdown.value)

    return dropdown.value;
}

function getTimeStampFromPickerById(id) {
    const fromDateInput = document.getElementById(id);

    const fromDateStr = fromDateInput.value;
    setLocalStorageItem("date_" + id, fromDateStr)

    const fromDateTimestamp = new Date(fromDateStr).getTime();
    return fromDateTimestamp
}


function loadInputValue(type, id) {
    const fromDateInput = document.getElementById(id);
    id = type + "_" + id
    if (getLocalStorageItem(id))
        fromDateInput.value = getLocalStorageItem(id)
}


function plotGraph(historyResponse) {

    const canvas = document.getElementById("myChart");
    try {

        Object.keys(Chart?.instances)?.forEach(ex => {
            if (ex)
                Chart?.instances[ex].destroy();

        })
    } catch (e) {

    }

    let normalization = getSelectedOptionValue("normalization")

    let allScipSymbols = Object.keys(historyResponse)
    let firstKey = allScipSymbols[0]
    let timeStamps = historyResponse[firstKey].map(oj => {
        return moment(oj.datetime).format("MMM DD HH:mm")
    })
    allScipSymbols.forEach(e => {
        historyResponse[e].forEach(oj => {
            oj.label = moment(oj.datetime).format("MMM DD HH:mm")
        })
    })

    let firstVals = {}
    let cfg = {
        type: 'line',
        data: {
            labels: timeStamps,
            datasets: allScipSymbols.map((tradingsymbol) => {
                return {
                    label: tradingsymbol,
                    data: historyResponse[tradingsymbol].map(tick => {
                        if (normalization == 'normalized') {
                            if (!firstVals[tradingsymbol]) {
                                firstVals[tradingsymbol] = tick.close
                            }
                            let newValue = parseFloat(tick.close) / Math.max(1, parseFloat(firstVals[tradingsymbol]))
                            return newValue
                        }
                        else {
                            return parseFloat(tick.close)
                        }

                    })
                }
            })
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        labelPointStyle: function (context) {
                            return {
                                pointStyle: 'triangle',
                                rotation: 0
                            };
                        },
                        label: function (context) {
                            let label = context.dataset.label || '';
                            allScipSymbols.forEach(sym => {
                                let datas = historyResponse[sym]
                                let matchOthr = findObjectByField(datas, 'label', context.label)
                                label = label + "\n[" + matchOthr.symbol + ": " + matchOthr.close + "]\n"
                            })
                            return label;
                        }
                    }
                }
            }
        }
    }

    new Chart(
        canvas,
        cfg
    );

}

function findObjectByField(array, fieldName, value) {
    return array.find(function (obj) {
        return obj[fieldName] === value;
    });
}

// Function to generate a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
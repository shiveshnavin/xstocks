function getHost() {
    return ""
}
function login() {
    axios.get(getHost() + `/zerodha/login?userid=AMC939`)
        .then(response => {
            dataDisplay.innerHTML = JSON.stringify(response.data);
        })
        .catch(error => {
            console.error(error);
        });
}
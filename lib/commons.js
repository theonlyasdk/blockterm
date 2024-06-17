const url_params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});

const fromId = (id) => document.getElementById(id)
const query = (qs) => document.querySelector(qs)
const queryAll = (qs) => document.querySelectorAll(qs)

const shuffle = (array) => {
    // https://javascript.info/task/shuffle
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

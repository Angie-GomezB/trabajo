const { createApp } = Vue;
const mainDivId = "#loginContentDiv";
var vm = null, loginVue = null;
loginVue = {
    data() {
        return {
            loginData: {
                username: "",
                password: ""
            },
            errorMessage: "",
            autType: "",
            username: "",
        };
    },
    async mounted() {
        hideProgress();
    },
    methods: {
        async login() {
            this.errorMessage = "";
            showProgress();
            var data = await httpFunc("/auth/login", this.loginData);
            if (data.isError == false) {
                if (data.data && data.data.username) {
                    localStorage.setItem("username", data.data.username);
                } else {
                    // Guardar el ingresado si el servidor no lo envía
                    localStorage.setItem("username", this.loginData.username);
                }
                window.location = "./";
            }
            else {
                showError(data.errorMessage);
                hideProgress();
            } 
        }
    }
};
vm = createApp(loginVue).mount(mainDivId);

function showProgress() {
    document.getElementById("divProcess").style.display = "block";
    return false;
}
function hideProgress() {
    document.getElementById("divProcess").style.display = "none";
    return false;
}

function showMessage(msg) {
    if (msg.indexOf("Error") == 0)
        document.getElementById("lbMessage").style.color = "red";
    else document.getElementById("lbMessage").style.color = "black";

    document.getElementById("lbMessage").innerText = msg;
    document.getElementById("divMessage").style.display = "block";
    document.getElementById("btAccept").focus();
    return false;
}
function showSuccess(msg) {
    if (msg == null) return;
    var element = document.getElementById("snSuccess");
    element.innerText = msg;
    element.classList.add("active");
    setTimeout(() => {
        hideSuccess();
    }, 6000);
}
function hideSuccess() {
    var element = document.getElementById("snSuccess");
    element.innerText = "";
    element.classList.remove("active");
}
function showError(msg) {
    if (msg == null) return;
    var element = document.getElementById("snError");
    element.innerText = msg;
    element.classList.add("active");
    setTimeout(() => {
        hideError();
    }, 6000);
}
function hideError() {
    var element = document.getElementById("snError");
    element.innerText = "";
    element.classList.remove("active");
}
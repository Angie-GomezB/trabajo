/****************************************************************************************************************************************/
/************************************************* VUEJS ********************************************************************************/
/****************************************************************************************************************************************/
const { createApp } = Vue;
var GlobalVariables = {
    username: null,
    roles: null,
    loadModule: null,
    modules: null,
    ruta: null,
    passwordPolicy: null

};
const mainDivId = "#mainContentDiv";
var vm = null, mainVue = null, indexMainDiv = null;
mainVue = {
    data() {
        return {
            moduleSelected: null,
            loginData: { user: "", roles: [], debug: false },
            modules: {},
            showMobileMenu: true,
            showModuleMenu: false,
            username: "",
            mostrarMenu: false,
            zones: null,
            zoneSelected: null,
            zonePreSelected: null,
            initialized: false,
        }
    },
    computed: {
        visibleModules() {
            if (!this.modules || !this.zonePreSelected) return [];
            var ret = [];
            for (var key in this.modules) {
                if (this.modules[key].hidden != true && this.zonePreSelected != null && this.zonePreSelected.name == this.modules[key].zone
                    && this.checkAcces(key))
                    ret.push({ key: key, value: this.modules[key] });
            }
            return ret;
        }, visibleZones() {
            var ret = { };
            for (var zone in this.zones) {
                var hasZoneAcces = false;
                for (var key in this.modules) {
                    if (this.modules[key].hidden != true && zone == this.modules[key].zone
                        && this.checkAcces(key))
                        hasZoneAcces = true;
                }
                if(hasZoneAcces)
                    ret[zone] = this.zones[zone];
            }
            return ret;
        }
    },
    async mounted() {
        indexMainDiv = document.getElementById("mainContentDiv");
        document.getElementById("indexMainDiv").style.display = "block";
        const pars = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });
        var url = window.location.href;
        if (url.indexOf("?") > 0)
            url = url.substring(0, url.indexOf("?"));
        if (pars.loc != null)
            url += "?loc=" + pars.loc;
        //window.history.replaceState({}, document.title, url);
        showProgress();
        var data = (await httpFunc("/auth/getUserProfile", {})).data;
        this.loginData = data;
        this.modules = GlobalVariables.modules["modules"];
        this.zones = GlobalVariables.modules["zones"];
        GlobalVariables.roles = data.roles;
        GlobalVariables.username = data.user;
        this.username = localStorage.getItem("username") || data.user;
        GlobalVariables.loadModule = this.loadModule;
        GlobalVariables.ruta = localStorage.getItem('ruta');
        if (pars.loc != null && this.modules[pars.loc] != null) {
            var inpParamter = null;
            if (pars.id != null)
                inpParamter = { "data": { "id": pars.id } };
            await this.loadModule(pars.loc, inpParamter);
            this.mostrarMenu = true;
        } else {
            await this.loadModule("Index");
            this.mostrarMenu = true;
        }
        hideProgress();
        window.onpopstate = function (e) {
            if (e.state != null && e.state.moduleName != null)
                this.loadModule(e.state.moduleName);
        }.bind(this);
    },
    methods: {
        async loadModule(name, inputParameter) {
            indexMainDiv.style.display = "block";
            if (inputParameter == null && this.modules[name] != null && this.modules[name].inputParameter != null)
                inputParameter = this.modules[name].inputParameter;
            if (this.modules[name] === this.moduleSelected) {
                if (inputParameter != null) {
                    inputParameter.moduleAreadyLoaded = true;
                    vm.inputParameter = inputParameter;
                    vm.mount(mainDivId);
                }
                this.showModuleMenu = false;
                return;
            }
            showProgress();
            if (vm != null)
                vm.unmount();
            if (name == "Index" || !this.checkAcces(name)) {
                indexMainDiv.innerHTML = "";
                document.getElementById("indexMenuDiv").style.display = "block";
                indexMainDiv.style.display = "none";
                //document.getElementById("mainFooter").style.display = "none";
                this.moduleSelected = null;

                document.title = "Inicio";
                //indexMainDiv.style.minHeight = "auto";
                hideProgress();

                var url = window.location.href;
                if (url.indexOf("?") > 0)
                    url = url.substring(0, url.indexOf("?"))
                if (name == "Index")
                    this.showMobileMenu = false;
                window.history.pushState({ moduleName: name }, document.title, url);
                return;
            }
            if (this.modules[name] == null) {
                indexMainDiv.innerHTML = name;
                hideProgress();
                return;
            }
            this.showMobileMenu = false;
            this.showModuleMenu = false;
            this.moduleSelected = this.modules[name];
            this.moduleSelected.moduleName = name;
            document.title = this.moduleSelected.title;
            if (this.moduleSelected.moduleObj == null) {
                this.moduleSelected.moduleObj = await import(this.moduleSelected.jsUrl);
                this.moduleSelected.moduleObj = this.moduleSelected.moduleObj.default;
            }
            if (this.moduleSelected.moduleObj.template == null || this.moduleSelected.moduleObj.template == "")
                this.moduleSelected.moduleObj.template = await (await fetch(this.moduleSelected.templateUrl)).text();
            this.zoneSelected = this.zones[this.moduleSelected["zone"]];
            this.loadVueModule(inputParameter);

            if (GlobalVariables.ruta && !GlobalVariables.ruta.includes(name)) {
                GlobalVariables.ruta = GlobalVariables.ruta + " / " + name;
                localStorage.setItem('ruta', GlobalVariables.ruta);
            }
        },
        loadVueModule(inputParameter) {
            document.getElementById("indexMenuDiv").style.display = "none";

            delete this.moduleSelected.moduleObj.data.inputParameter;
            if (inputParameter != null)
                this.moduleSelected.moduleObj.data.inputParameter = inputParameter;
            vm = createApp(this.moduleSelected.moduleObj);
            vm.mount(mainDivId);
            hideProgress();
            var url = window.location.href;
            if (url.indexOf("?") > 0)
                url = url.substring(0, url.indexOf("?"))
            url += "?loc=" + this.moduleSelected.moduleName;
            window.history.pushState({ moduleName: this.moduleSelected.moduleName }, this.moduleSelected.title, url);
        },
        isActiveModule(name) {
            return this.modules[name] == this.moduleSelected || (this.moduleSelected == null && name == "Index");
        },
        checkAcces(name) {
            if (name == "Index" || this.modules[name].allow.indexOf("*") >= 0)
                return true; 
            for (var i = 0; i < this.loginData.roles.length; i++) {
                if (this.modules[name].allow.indexOf(this.loginData.roles[i]) >= 0)
                    return true;
            }
            return false;
        },
        handleClick(item) {
            if (item.isLogOut) {
                this.logOut();
            } else {
                this.openZone(item);
            }
        },
        async logOut() {
            showProgress();
            var data = await httpFunc("/auth/logout", {});
            window.location = "./login.html";
        },
        openZone(item) {
            this.zonePreSelected = item;
            this.showModuleMenu = true;
        },
        closeMenu() {
            this.showModuleMenu = false;
            this.zonePreSelected = null;
        },
        getModules() {
            if (this.zonePreSelected) {
                const visibleModules = Object.entries(this.modules)
                    .filter(([key, value]) => !value.hidden && value.zone == this.zonePreSelected.name)
                    .reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {});
                return visibleModules;
            }
            else {
                return null;
            }
        }
    }
};
/****************************************************************************************************************************************/
/******************************************************* SCRIPT LOADING FUNCTIONS *******************************************************/
/****************************************************************************************************************************************/
// Creates de VueJs instance
initVueInstance();
async function initVueInstance() {
    var moduleMap = await import("./indexConfig.js");
    GlobalVariables.modules = moduleMap;
    AxiosMethods.autoErrorFunction = showError;
    const app = createApp(mainVue);
    app.mount("#indexMainDiv");

}
/****************************************************************************************************************************************/
/******************************************************* COMMON FUNCTIONS ***************************************************************/
/****************************************************************************************************************************************/
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
    hideProgress();
    setTimeout(() => {
        hideError();
    }, 6000);
}
function hideError() {
    var element = document.getElementById("snError");
    element.innerText = "";
    element.classList.remove("active");
}
function hideMessage() {
    document.getElementById("divMessage").style.display = "none";
    hideProgress();
    return false;
}
function showConfirm(msg, title, textOk, textCancel) {
    var element = document.getElementById("divConfirm");
    var overlay = document.getElementById("divConfirmOverlay");
    element.classList.add("active");
    overlay.classList.add("active");

    document.getElementById("lbConfirmMessage").innerHTML = msg;
    document.getElementById("lbConfirmTitle").innerHTML = (title == null? "Confirmación":title);
    var confirm = document.getElementById("btConfirmAccept");
    var cancel = document.getElementById("btConfirmCancel");
    confirm.innerText = textOk != null ? textOk : "Confirmar";
    cancel.innerText = textCancel != null ? textCancel : "Cancelar";
    confirm.focus();

    var p = new Promise((resolve) => {
        confirm.onclick = function () {
            element.classList.remove("active");
            overlay.classList.remove("active");
            resolve(true);
        };
        cancel.onclick = function () {
            element.classList.remove("active");
            overlay.classList.remove("active");
            resolve(false);
        };
        //document.getElementById("btXConfirmCancel").onclick = function () {
        //    if (cancelCallback != null)
        //        cancelCallback(event);
        //    document.getElementById("divConfirm").style.display = "none";
        //};
    });

    return p;
}
function showMessageVue(data) {
    if (data.errorMessage != null)
        showMessage(data.errorMessage);
    else if (data.d != null)
        showMessage(data.d);
    else if (data.Message != null)
        showMessage(data.Message);
    else if (data.message != null)
        showMessage(data.message);
    else if (typeof data.message == "string")
        showMessage(data.message);
    else if (typeof data == "string")
        showMessage(data);
    else
        console.log(data);
    hideProgress();
}
function formatoMoneda(val) {
    var ret = "", n = 0;
    if (typeof val == "string") {
        if (val == "") return "-";
        val = parseFloat(val);
    }

    val = Math.round(val) + "";
    for (var i = val.length - 1; i >= 0; i--) {
        ret = val[i] + ret;
        n++;
        if (n % 3 == 0 && i > 0)
            ret = "." + ret;
    }
    return "$" + ret;

};

/****************************************************************************************************************************************/
/****************************************************************************************************************************************/
/****************************************************************************************************************************************/
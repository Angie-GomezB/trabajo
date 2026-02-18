/****************************************************************************************************************************************/
/************************************************* AXIOS ********************************************************************************/
/****************************************************************************************************************************************/
var AxiosConfig = {
    defaultUrl: null,
    defaultDB: null,
    version: null,
    urlPrefix: ""
};
var AxiosMethods = {
    loginMethod: null,
    autoErrorFunction: null
};

var AxiosConst = {
    GENERIC_DT: "genericDT",
    GENERIC_DS: "genericDS",
    GENERIC_ST: "genericST",
    GENERIC_DO: "genericDO",
    EXPORT_DATA: "exportData",
    EXPORT_DATA_SP: "exportDataSP",
    EXECUTE_SP: "executeSP"
}
axios.defaults.withCredentials = true;
axios.defaults.maxRedirects = true;
axios.defaults.validateStatus = function (status) { return true; };
async function httpFunc(path, data, auto) {
    if (path.indexOf("/") == 0 && AxiosConfig.urlPrefix == "")
        path = path.substring(1);
    var resp = await axios.post(AxiosConfig.urlPrefix + path, data);
    if (resp.status == 200) {
        if (resp.data["isError"] == true && auto == "auto" && AxiosMethods.autoErrorFunction != null) {
            AxiosMethods.autoErrorFunction(resp.data["errorMessage"]);
            console.log(resp);
            throw new Error({ message: resp.data["errorMessage"], path: path, data: data });
        }
        return resp.data;
    }
    console.log(resp);
    if (resp.status == 401) window.location.href = '/login.html';
    //if (resp.status == 403) 
    throw new Error({ message: resp.statusText, path: path, data: data });
}
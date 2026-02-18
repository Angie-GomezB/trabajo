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
function hideMessage() {
    document.getElementById("divMessage").style.display = "none";
    hideProgress();
    return false;
}
function showConfirm(msg, okCallback, cancelCallback, event, textOk, textCancel) {
    document.getElementById("divConfirm").style.display = "block";
    document.getElementById("lbConfirmMessage").innerHTML = msg;
    var confirm = document.getElementById("btConfirmAccept");
    var cancel = document.getElementById("btConfirmCancel");
    confirm.onclick = function () {
        if (okCallback != null)
            okCallback(event);
        document.getElementById("divConfirm").style.display = "none";
    };
    cancel.onclick = function () {
        if (cancelCallback != null)
            cancelCallback(event);
        document.getElementById("divConfirm").style.display = "none";
    };
    document.getElementById("btXConfirmCancel").onclick = function () {
        if (cancelCallback != null)
            cancelCallback(event);
        document.getElementById("divConfirm").style.display = "none";
    };
    confirm.innerText = textOk != null ? textOk : "Aceptar";
    cancel.innerText = textCancel != null ? textCancel : "Cancelar";
    document.getElementById("btConfirmAccept").focus();

    return false;
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
/****************************************************************************************************************************************/
/****************************************************************************************************************************************/
/****************************************************************************************************************************************/
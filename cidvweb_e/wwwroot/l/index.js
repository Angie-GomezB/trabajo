const { createApp } = Vue;
var mainVue = null;
AxiosConfig.urlPrefix = "..";
mainVue = {
    data() {
        return {  
            token: "",
            pfsData: null,
            pfsAllData: null,
            mode: 0,
            aproveData: {
                "Token": "",
                "Orden_Compra": "",
                "Fecha_Orden_Compra": "",
                "Archivo": "",
                "Ruta": "",
                "Datos": "",
                "Observaciones": ""
            },
            formValidator: {},
            files: [],
            fileMode: "",
            fileResult: null
        }
    },
    async mounted() {
        document.getElementById("indexMainDiv").style.display = "block";
        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });
        this.token = params.t;
        if (this.token == null || this.token == "") {
            this.mode = 404;
            this.token = "Sin token";
        } else
            this.getSesion();
        if (typeof history.pushState === "function") {
            window.addEventListener('popstate', this.back);
        }
    },
    methods: {
        back() {
            if (this.mode == 0) return;
            else this.mode = 0;

        },
        async getSesion() {
            showProgress();
            var resp = await httpFunc("/generic/genericDS/Landing-Get_Detalle_Prefactura", { "Token": this.token }, "auto");           
            if (resp.data.length == 1) {
                this.mode = 200;
                hideProgress();
                return;
            }
            this.pfsData = {};
            this.pfsData.header = resp.data[0][0];
            if (this.pfsData.header["Numero_Prefactura"] == "") {
                this.mode = 404;
                hideProgress();
                return;
            }
            this.pfsData.summary = resp.data[1];
            this.pfsData.detail = resp.data[3];
            this.pfsAllData = resp.data;
            hideProgress();
        },
        option01() {
            this.formValidator = {};
            history.pushState("Option 1", null, null);
            this.mode = 2;
        },
        option02() {
            this.formValidator = {};
            history.pushState("Option 2", null, null);
            this.mode = 3;
        },
        option03() {
            this.formValidator = {};
            history.pushState("Option 3", null, null);
            this.mode = 4;
        },
        openFileDialog(mode) {
            this.fileMode = mode;
            this.files = [];
            document.getElementById("fileUpload").value = null;
            document.getElementById("fileUpload").click();
        },
        handleChangeFile(event) {
            this.files = [];
            const selectedFiles = event.target.files;
            for (let i = 0; i < selectedFiles.length; i++) {
                this.files.push(selectedFiles[i]);
            }
            event.target.value = null;
            if (this.fileMode == "UPLOAD01") {
                this.aproveData["Archivo"] = this.files[0].name;
                this.files = [this.files[0]];
            } else if (this.fileMode == "UPLOAD02") {
                showProgress();
                var file = this.files[0];
                var self = this;
                self.fileResult = null;
                const reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onload = async () => {
                    self.fileResult = await self.processFile(reader.result);
                    console.log(self.fileResult);
                    hideProgress();
                };
            }
            
        },
        cancelFile(mode) {
            if (mode == "UPLOAD01") {
                this.aproveData["Archivo"] = "";
                this.files = [];
            } else if (mode == "UPLOAD02") {
                this.fileResult = null;
                this.files = [];
            }
        },
        async sendAprovedData() {
            showProgress();
            this.formValidator = {};
            if (this.files.length > 0) { 
                var form = new FormData();
                for (let i = 0; i < this.files.length; i++)
                    form.append(this.files[i].name, this.files[i]);
                var resp = await httpFunc("/file/upload", form);
                this.aproveData["Ruta"] = resp.data[0]["serverName"];
            }
            this.aproveData["Token"] = this.token;
            if (this.aproveData["Orden_Compra"] == "") this.formValidator["Orden_Compra"] = "Error - El valor del campo 'Orden_Compra' es inválido";
            if (this.aproveData["Fecha_Orden_Compra"] == "") this.formValidator["Fecha_Orden_Compra"] = "Error - El valor del campo 'Orden_Compra' es inválido";
            for (var key in this.formValidator) {
                showError(this.formValidator[key]);
                hideProgress();
                return;
            }
            resp = await httpFunc("/generic/genericST/Landing-Ins_Aprobacion_Express", this.aproveData, "auto");
            showSuccess(resp.data);
            this.mode = 200;
            hideProgress();
        },
        async sendEditData() {
            showProgress();
            this.formValidator = {};
            if (this.files.length > 0) {
                var form = new FormData();
                for (let i = 0; i < this.files.length; i++)
                    form.append(this.files[i].name, this.files[i]);
                var resp = await httpFunc("/file/upload", form);
                this.aproveData["Ruta"] = resp.data[0]["serverName"];
            }
            this.aproveData["Token"] = this.token;
            this.aproveData["Datos"] = "";
            if (this.fileResult != null)
                this.aproveData["Datos"] = this.fileResult["fileData"];

            //if (this.aproveData["Orden_Compra"] == "") this.formValidator["Orden_Compra"] = "Error - El valor del campo 'Orden_Compra' es inválido";
            //if (this.aproveData["Fecha_Orden_Compra"] == "") this.formValidator["Fecha_Orden_Compra"] = "Error - El valor del campo 'Orden_Compra' es inválido";
            if (this.aproveData["Datos"] == "") this.formValidator["Datos"] = "Error - Debe cargar el archivo de guías";
            if (this.fileResult != null && this.fileResult["fileResult"] != "OK") this.formValidator["fileResult"] = this.fileResult["fileResult"];
            for (var key in this.formValidator) {
                showError(this.formValidator[key]);
                hideProgress();
                return;
            }
            resp = await httpFunc("/generic/genericST/Landing-Ins_Aprobacion_Edicion", this.aproveData, "auto");
            showSuccess(resp.data);
            this.mode = 200;
            hideProgress();
        },
        async sendOtherData() {
            showProgress();
            this.formValidator = {};
            if (this.aproveData["Observaciones"] == "") this.formValidator["Observaciones"] = "Error - El valor del campo 'Observaciones' es inválido";
            for (var key in this.formValidator) {
                showError(this.formValidator[key]);
                hideProgress();
                return;
            }
            this.aproveData["Token"] = this.token;
            resp = await httpFunc("/generic/genericST/Landing-Ins_Aprobacion_Otros", this.aproveData, "auto");
            showSuccess(resp.data);
            this.mode = 200;
            hideProgress();
        },
        async processFile(buffer) {
            var body = { fileId: "", fileResult: "", fileData: "" };
            try {
                var excelColumnNames = [
                    "Guia",
                    "Servicio Solicitado",
                    "Piezas Solicitadas",
                    "Peso Solicitado",
                    "Unidad Media Peso Solicitado",
                    "Largo Solicitado",
                    "Ancho Solicitado",
                    "Alto Solicitado",
                    "Unidad De Medida Dimensiones Solicitado",
                    "Total Guia Solicitado",
                    "Incluir"
                ];
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                var worksheet = workbook.getWorksheet("Resumen");
                if (worksheet == null) {
                    body.fileResult = "Error - No se encuentra la hoja de resumen";
                    return body;
                }
                body.fileId = worksheet.getCell("B5").value;
                worksheet = workbook.getWorksheet("Detalle Envio");
                if (worksheet == null) {
                    body.fileResult = "Error - No se encuentra la hoja de datos";
                    return body;
                }
                var row = worksheet.getRow(1), rownum = 1, columnMap = [], cellCount = row.cellCount, cell, tmp;
                excelColumnNames.forEach(element => {
                    var map = { name: element, value: null };
                    for (let i = 1; i <= cellCount; i++) {
                        cell = row.getCell(i);
                        if (cell.value == element) {
                            map.value = i;
                            break;
                        }
                    }
                    columnMap.push(map);
                });
                tmp = columnMap.find((element) => { return element.value == null; });
                if (tmp != null) {
                    body.fileResult = "Error - No se encuentra la columna " + tmp.name;
                    return body;
                }
                row = worksheet.getRow(++rownum);
                tmp = row.getCell(columnMap[0].value).value;
                while (tmp != null && tmp != "") {
                    columnMap.forEach(element => {
                        body.fileData += clearText(row.getCell(element.value).value) + ";";
                    });
                    body.fileData += "|";
                    row = worksheet.getRow(++rownum);
                    tmp = row.getCell(columnMap[0].value).value;
                }
                body.fileResult = "OK";

            } catch (error) {
                body.fileResult = "Error - " + error.message;
            }
            return body;
        },
        viewFile() {
            this.mode = 1;
            history.pushState("View File", null, null);
        },
        exportFile(source) {
            var source = this.pfsAllData;
            showProgress();
            const workbook = new ExcelJS.Workbook();
            const moneyFormat = "$ #,##0.00;[Red]-$ #,##0.00";
            var sheet = workbook.addWorksheet("Resumen");
            var row = sheet.getRow(1);
            row.getCell(1).value = "CIDV Chile";
            row.getCell(1).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "4f81bd" } };
            row.getCell(1).font = { "color": { "argb": "ffffff" } };

            row.getCell(5).value = "Convenciones";
            row.getCell(5).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "4f81bd" } };
            row.getCell(5).font = { "color": { "argb": "ffffff" } };
            row.getCell(6).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "4f81bd" } };
            row.getCell(7).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "4f81bd" } };
            row = sheet.getRow(2);
            row.getCell(1).value = "Cuenta";
            row.getCell(2).value = source[0][0]["Cuenta"];
            row.getCell(5).value = "Amarillo";
            row.getCell(5).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "ffff00" } };
            row.getCell(7).value = "Solicitado";
            row = sheet.getRow(3);
            row.getCell(1).value = "Cliente";
            row.getCell(2).value = source[0][0]["Nombre"];
            row.getCell(5).value = "Azul";
            row.getCell(5).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "9bc2e6" } };
            row.getCell(7).value = "Original";
            row = sheet.getRow(4);
            row.getCell(1).value = "RTN Cliente";
            row.getCell(2).value = source[0][0]["RTN"];
            row.getCell(5).value = "Verde";
            row.getCell(5).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "a8d08e" } };
            row.getCell(7).value = "Aprobado";
            row = sheet.getRow(5);
            row.getCell(1).value = "PRE-FACTURA";
            row.getCell(2).value = source[0][0]["Numero_Prefactura"];
            row.getCell(5).value = "Salmon";
            row.getCell(5).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row.getCell(7).value = "OC";
            row = sheet.getRow(6);
            row.getCell(2).value = "Valor";
            row.getCell(3).value = "Fecha";

            row = sheet.getRow(7);
            row.getCell(1).value = "No. Orden Compra";
            row.getCell(2).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row.getCell(3).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row = sheet.getRow(8);
            row.getCell(1).value = "Hoja de entrada de servicio";
            row.getCell(2).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row.getCell(3).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row = sheet.getRow(9);
            row.getCell(1).value = "Hoja de entrada de servicio";
            row.getCell(2).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row.getCell(3).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row = sheet.getRow(10);
            row.getCell(1).value = "Nota de Pedido";
            row.getCell(2).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row.getCell(3).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row = sheet.getRow(11);
            row.getCell(1).value = "Fecha Referencia";
            row.getCell(2).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };
            row.getCell(3).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "f4b084" } };

            var headers = { "Cargo": "text//9bc2e6", "Total": "money//9bc2e6" };
            var rowdata = source[1];
            this.writeTable(sheet, headers, rowdata, 12, 1);

            row = sheet.getRow(13 + rowdata.length);
            row.getCell(1).value = "Total Documento";
            row.getCell(1).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "9bc2e6" } };
            row.getCell(2).value = parseFloat(source[0][0]["Total"]);
            row.getCell(2).numFmt = moneyFormat;
            row.getCell(2).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": "9bc2e6" } };;

            var col = sheet.getColumn(1);
            col.width = 50;
            col = sheet.getColumn(2);
            col.width = 25;

            sheet = workbook.addWorksheet("Detalle Envio");
            headers = source[2][0];
            rowdata = source[3];
            this.writeTable(sheet, headers, rowdata, 1, 1);

            sheet = workbook.addWorksheet("Detalle Cobro");
            headers = source[4][0];
            rowdata = source[5];
            this.writeTable(sheet, headers, rowdata, 1, 1);

            var buff = workbook.xlsx.writeBuffer().then(function (data) {
                var blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                saveAs(blob, this.pfsData.header.Numero_Prefactura + ".xlsx");
                hideProgress();

            }.bind(this));
        },
        writeTable(sheet, headers, rowdata, rownum, columnnum) {
            const moneyFormat = "$ #,##0.00;[Red]-$ #,##0.00";
            var colnum = columnnum, colvalue, col;
            var row = sheet.getRow(rownum);
            for (var key in headers) {
                colvalue = headers[key].split("/");
                headers[key] = {};
                headers[key]["type"] = colvalue[0];
                headers[key]["width"] = colvalue[1];
                headers[key]["color"] = colvalue[2];
                headers[key]["visible"] = colvalue[3];
                row.getCell(colnum).value = key.replace(/_/g, " ");
                col = sheet.getColumn(colnum);
                if (headers[key]["width"] != null && headers[key]["width"] != "")
                    col.width = headers[key]["width"];
                if (headers[key]["color"] != null && headers[key]["color"] != "")
                    row.getCell(colnum).fill = { "type": "pattern", "pattern": "solid", "fgColor": { "argb": headers[key]["color"] } };
                if (headers[key]["type"] == "money")
                    col.numFmt = moneyFormat;;
                colnum++;
            }
            for (var i = 0; i < rowdata.length; i++) {
                row = sheet.getRow(rownum + 1 + i);
                colnum = columnnum;
                for (var key in headers) {
                    colvalue = rowdata[i][key];
                    if (headers[key]["visible"] == "hidden")
                        break;
                    else if (headers[key]["type"] == "number" && colvalue == "")
                        colvalue = null;
                    else if (headers[key]["type"] == "money" && colvalue != "")
                        colvalue = parseFloat(colvalue);
                    else if (headers[key]["type"] == "money" && colvalue == "")
                        colvalue = null;
                    else if (headers[key]["type"] == "date" && colvalue != "")
                        colvalue = new Date(colvalue);
                    else if (headers[key]["type"] == "date" && colvalue == "")
                        colvalue = null;
                    if (isNaN(colvalue))
                        colvalue = rowdata[i][key];
                    row.getCell(colnum).value = colvalue;
                    colnum++;
                }
            }
        },


        formatoMoneda(val) {
            var ret = "", n = 0;
            if (typeof val == "string") {
                if (val == "") return "-";
                val = parseFloat(val);
            }
            var sign = "";
            if (val < 0) {
                sign = "- ";
                val = Math.abs(val);
            }
            val = Math.round(val) + "";
            for (var i = val.length - 1; i >= 0; i--) {
                ret = val[i] + ret;
                n++;
                if (n % 3 == 0 && i > 0)
                    ret = "." + ret;
            }
            return sign + "$" + ret;
        }
    }
};
/****************************************************************************************************************************************/
/******************************************************* SCRIPT LOADING FUNCTIONS *******************************************************/
/****************************************************************************************************************************************/
// Creates de VueJs instance
initVueInstance();
async function initVueInstance() {
    mainVue = createApp(mainVue);
    mainVue.mount("#indexMainDiv");
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
    document.getElementById("lbConfirmTitle").innerHTML = (title == null ? "Confirmación" : title);
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
    });
    return p;
}
function showProgress() {
    document.getElementById("divProcess").style.display = "block";
    return false;
}
function hideProgress() {
    document.getElementById("divProcess").style.display = "none";
    return false;
}
function clearText(value) {
    if (value == null) return "";
    value += "";
    return value.replace(/[\r\n\t=&|;"':]/g, "").trim();
};
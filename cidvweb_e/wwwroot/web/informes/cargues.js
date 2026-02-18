export default {
    data() {
        return {
            mode: 0,
            procedures: [],
            selectedProcedure: 0,
            parsProcedure: { pars: [], parsLen: 0, resul: null, file: null, fileName: null },
            files: []
        };
    },
    async mounted() {
        showProgress();
        var resp = await httpFunc("/generic/genericDT/Asignaciones-Get_Cargues", { "Usuario": "" }, "auto");
        this.procedures = resp.data;
        hideProgress();
    },
    methods: {
        async updateProcedure() {
            this.parsProcedure.pars = [];
            this.parsProcedure.parsLen = 0;
            this.parsProcedure.file = null;
            this.parsProcedure.fileName = null;
            if (this.selectedProcedure == "0") return;
            showProgress();
            var selectedObject = this.procedures.find(function (objValue) { return objValue["Id_Procedimiento_Informe"] == this.selectedProcedure }.bind(this));
            var resp = await httpFunc("/op/getProcedureParameters", selectedObject, "auto");
            var data = resp.data;
            console.log(data);
            var par;
            for (var i = 0; i < data.length; i++) {
                if (data[i]["Parameter"] == "@RETURN_VALUE") continue;
                par = { parameter: data[i]["Parameter"].replace("@", ""), type: this.typeConverter(data[i].Type), visible: true, value: null };
                if (par.parameter.toLowerCase() == "usuario" || par.parameter.toLowerCase() == "created_by" || par.parameter.toLowerCase() == "roles") {
                    par.visible = false;
                    par.value = "";
                } else {
                    this.parsProcedure.parsLen++;
                }
                this.parsProcedure.pars.push(par);
            }
            hideProgress();
        },
        async execProcedure() {
            this.parsProcedure.result = null;
            this.formValidator = {};
            if (this.selectedProcedure == "0") return;
            var selectedObject = this.procedures.find(function (objValue) { return objValue["Id_Procedimiento_Informe"] == this.selectedProcedure }.bind(this));
            var pars = {
                pars: [],
                type: selectedObject["Tipo"],
                sp: selectedObject["Procedimiento"],
                table: selectedObject["Tabla"],
                isText: selectedObject["Es_Texto"] == "True",
                header: selectedObject["Encabezado"] == "True",
                separator: selectedObject["Separador"],
                fileName: null
            };
            if (this.parsProcedure.fileName == "" || this.parsProcedure.fileName == null) this.formValidator["fileName"] = "Error - Debes seleccionar un archivo";
            for (var i = 0; i < this.parsProcedure.pars.length; i++) {
                if (this.parsProcedure.pars[i].visible && (this.parsProcedure.pars[i].value == null || this.parsProcedure.pars[i].value == "")) {
                    this.formValidator[this.parsProcedure.pars[i].parameter] = "Error - El valor del parámetro " + this.parsProcedure.pars[i].parameter + " es inválido";
                    return;
                }
                pars.pars.push({ name: this.parsProcedure.pars[i].parameter, value: this.parsProcedure.pars[i].value });
            }
            for (var key in this.formValidator) {
                showError(this.formValidator[key]);
                hideProgress();
                return;
            }
            showProgress();
            var form = new FormData();
            form.append(this.files[0].name, this.files[0]);
            var resp = await httpFunc("/file/upload", form);
            pars.fileName = resp.data[0]["serverName"];
            var resp = await httpFunc("/op/UploadExecute", pars, "auto");
            this.parsProcedure.result = resp.data;
            this.files = [];
            this.parsProcedure.fileName = null;
            showSuccess("El cargue se ejecutó correctamente");
            hideProgress();
        },
        openFileDialog() {
            this.files = [];
            this.parsProcedure.fileName = null;
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
            this.parsProcedure.fileName = this.files[0].name;
        },
        cancelFile() {
            this.files = [];
            this.parsProcedure.fileName = null;
        },
        formatName(name) {
            return name.replace("@", "").replace(/_/g, " ");
        },
        typeConverter(type) {
            type = type.toLowerCase();
            if (type == "int")
                return "number";
            else if (type == "date")
                return "date";
            else if (type == "datetime" || type == "smalldatetime")
                return "datetime-local";
            else if (type == "time")
                return "time";
            else return "text";
        }
    }
};

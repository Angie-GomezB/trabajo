export default {
    data() {
        return {
            mode: 0,
            procedures: [],
            selectedProcedure: 0,
            parsProcedure: { pars: [], parsLen: 0, result: null}
        };
    },
    async mounted() {
        showProgress();
        var resp = await httpFunc("/generic/genericDT/Informes-Get_Informes", { "Usuario": "" }, "auto");
        this.procedures = resp.data;
        hideProgress();
    },
    methods: {
        async updateProcedure() {
            this.parsProcedure.pars = [];
            this.parsProcedure.parsLen = 0;
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
                isText: selectedObject["Es_Texto"] == "True",
                header: selectedObject["Encabezado"] == "True",
                separator: selectedObject["Separador"]
            };
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
            var resp = await httpFunc("/op/execute", pars, "auto");
            this.parsProcedure.result = "La descarga del archivo iniciará automáticamene";
            var ext = resp.data.substring(resp.data.indexOf("."));
            window.location.href = "./file/download/" + encodeURIComponent(resp.data) + "/" + encodeURIComponent(selectedObject["Nombre"] + ext);
            showSuccess("El infome se ejecutó correctamente");
            hideProgress();
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

const modules = {
    "Informes": {
        templateUrl: "./web/informes/informes.html",
        jsUrl: "./web/informes/informes.js",
        title: "Informes",
        desc: "",
        imgSrc: "",
        zone: "Datos",
        allow: ["administrador", "coordinador", "director"]
    },
    "TRM": {
        templateUrl: "./web/trm/trm.html",
        jsUrl: "./web/trm/trm.js",
        title: "Consulta TRM",
        desc: "Tasa Representativa del Mercado - DIAN",
        imgSrc: "",
        zone: "Datos",
        allow: ["*"]
    },
    "Cargues": {
        templateUrl: "./web/informes/cargues.html",
        jsUrl: "./web/informes/cargues.js",
        title: "Cargues",
        desc: "",
        imgSrc: "",
        zone: "Datos",
        allow: ["administrador", "coordinador", "director"]
    },
    "Cidv": {
        templateUrl: "./web/cidv/cidv.html",
        jsUrl: "./web/cidv/cidv.js",
        title: "Cidv",
        desc: "",
        imgSrc: "",
        zone: "CIDV",
        allow: ["*"]
    },
    "Clientes_BCA": {
        templateUrl: "./web/clientes_bca/clientes.html",
        jsUrl: "./web/clientes_bca/clientes.js",
        title: "Clientes",
        desc: "Gestión de clientes FedEx Brasil",
        imgSrc: "",
        zone: "BCA",
        allow: ["*"]
    },
    "Facturas_BCA": {
        templateUrl: "./web/facturas_bca/facturas.html",
        jsUrl: "./web/facturas_bca/facturas.js",
        title: "Crear Facturas",
        desc: "Crear y gestionar facturas",
        imgSrc: "",
        zone: "BCA",
        allow: ["*"]
    },
    "Lista_Facturas_BCA": {
        templateUrl: "./web/facturas_bca/lista_facturas.html",
        jsUrl: "./web/facturas_bca/lista_facturas.js",
        title: "Pantalla Facturas",
        desc: "Listado y gestión de facturas",
        imgSrc: "",
        zone: "BCA",
        allow: ["*"]
    },
    "CuentasCIDV": {
        templateUrl: "./web/cidv/cuentas.html",
        jsUrl: "./web/cidv/cuentas.js",
        title: "Cuentas",
        desc: "",
        imgSrc: "",
        zone: "CIDV",
        allow: ["*"]
    },
    "Users": {
        templateUrl: "./web/users/users.html",
        jsUrl: "./web/users/users.js",
        title: "Admin. Usuarios",
        desc: "",
        imgSrc: "",
        zone: "Usuarios",
        allow: ["*"]
    }
};
const zones = {
    "BCA": {
        name: "BCA",
        title: "BCA · FedEx",
        img: "local_shipping"
    },
    "CIDV": {
        name: "CIDV",
        title: "CIDV",
        img: "support_agent"
    },
    "Usuarios": {
        name: "Usuarios",
        title: "Usuarios",
        img: "groups"
    },
    "Datos": {
        name: "Datos",
        title: "Datos",
        img: "data_exploration"
    }
};
export { modules, zones};
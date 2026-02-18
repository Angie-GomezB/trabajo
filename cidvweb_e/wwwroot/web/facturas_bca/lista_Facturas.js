export default {
    el: '#listaFacturasBcaDiv',

    data() {
        return {
            usuarioNombre: 'angie',
            sucursalNombre: 'FEDEX-BOG - Bogotá',

            pantalla: 'listado',
            pantallaAnterior: 'listado',

            todasFacturasCache: [],
            cargando: false,

            paginaVisible: 1,
            tamanioPagina: 20,
            cargandoMas: false,

            filtroIdFiscal: '',
            filtroNombre: '',

            facturaSeleccionada: null,

            historialFactura: [],
            cargandoHistorial: false,
            historialSeleccionado: null,

            guardando: false,
            formFactura: {
                Id_Factura: null,
                Sucursal_Emisora: '',
                Numero_Factura: '',
                Secuencia_Factura: 1,
                Id_Cliente: null,
                Fecha_Emision: '',
                Valor_Factura: 0,
                Valor_Impuesto: 0,
                Base_Calculo: 0,
                Porcentaje_Impuesto: 19,
                Tipo_Factura: '',
                modalidad: '',
                Tipo_Servicio: '',
                Estado_Factura: '',
                Codigo_Ean_Fedex: '',
                observaciones: '',
                Motivo_Cambio: ''
            },

            snackbar: { mostrar: false, mensaje: '', tipo: '', icono: '' }
        };
    },

    computed: {

        facturasFiltradas() {
            var resultado = this.todasFacturasCache;

            if (this.filtroIdFiscal.trim() !== '') {
                var id = this.filtroIdFiscal.trim().toLowerCase();
                resultado = resultado.filter(function (f) {
                    return f.Id_Fiscal && f.Id_Fiscal.toLowerCase().indexOf(id) >= 0;
                });
            }

            if (this.filtroNombre.trim() !== '') {
                var nombre = this.filtroNombre.trim().toLowerCase();
                resultado = resultado.filter(function (f) {
                    var nm1 = (f.Nm_Cliente1 || '').toLowerCase();
                    var ap1 = (f.Ap_Cliente1 || '').toLowerCase();
                    var completo = nm1 + ' ' + ap1;
                    return completo.indexOf(nombre) >= 0 ||
                        nm1.indexOf(nombre) >= 0 ||
                        ap1.indexOf(nombre) >= 0;
                });
            }

            return resultado;
        },

        facturasVisibles() {
            return this.facturasFiltradas.slice(0, this.paginaVisible * this.tamanioPagina);
        },

        formValido() {
            return this.formFactura.Sucursal_Emisora.trim() !== '' &&
                this.formFactura.Numero_Factura.trim() !== '' &&
                this.formFactura.Fecha_Emision !== '' &&
                this.formFactura.Tipo_Factura !== '' &&
                this.formFactura.modalidad !== '' &&
                this.formFactura.Tipo_Servicio !== '' &&
                this.formFactura.Valor_Factura > 0 &&
                this.formFactura.Motivo_Cambio.trim() !== '';
        },

        valorTotal() {
            return parseFloat(this.formFactura.Valor_Factura || 0) +
                parseFloat(this.formFactura.Valor_Impuesto || 0);
        }
    },

    mounted() {
        if (typeof GlobalVariables !== 'undefined' && GlobalVariables.userData) {
            this.usuarioNombre = GlobalVariables.userData.username || 'angie';
            this.sucursalNombre = GlobalVariables.userData.sucursal || 'FEDEX-BOG';
        }
        this.cargarFacturas();
    },

    methods: {

        nombreCompletoCliente(f) {
            if (!f) return '';
            var partes = [f.Nm_Cliente1, f.Ap_Cliente1];
            return partes.filter(function (p) { return p && p.trim() !== ''; }).join(' ');
        },

        formatCOP(valor) {
            if (!valor) return 'COP$ 0,00';
            return 'COP$ ' + parseFloat(valor).toLocaleString('es-CO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        formatFecha(fecha) {
            if (!fecha) return '-';
            // Evitar Invalid Date cortando solo la parte de fecha
            var solo = fecha.toString().substring(0, 10);
            var partes = solo.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
            return solo;
        },

        formatFechaHora(fecha) {
            if (!fecha) return '-';
            try {
                var solo = fecha.toString().substring(0, 10);
                var partes = solo.split('-');
                if (partes.length === 3) {
                    var hora = fecha.toString().length > 10 ? fecha.toString().substring(11, 16) : '';
                    return partes[2] + '/' + partes[1] + '/' + partes[0] + (hora ? ' ' + hora : '');
                }
            } catch (e) { }
            return fecha;
        },

        mostrarSnackbar(mensaje, tipo, icono) {
            this.snackbar.mostrar = true;
            this.snackbar.mensaje = mensaje;
            this.snackbar.tipo = tipo;
            this.snackbar.icono = icono;
            setTimeout(() => { this.snackbar.mostrar = false; }, 4000);
        },

        aplicarFiltros() {
            this.paginaVisible = 1;
            var el = document.getElementById('tablaFacturasScroll');
            if (el) el.scrollTop = 0;
        },

        onScrollTabla(event) {
            var el = event.target;
            var umbral = 80;
            var llegaAlFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - umbral;

            if (llegaAlFinal && !this.cargandoMas) {
                var totalFiltrado = this.facturasFiltradas.length;
                var totalVisible = this.facturasVisibles.length;

                if (totalVisible < totalFiltrado) {
                    this.cargandoMas = true;
                    setTimeout(() => {
                        this.paginaVisible += 1;
                        this.cargandoMas = false;
                    }, 200);
                }
            }
        },

        // ============================================
        // Carga de facturas — igual patron que clientes
        // ============================================
        async cargarFacturas() {
            this.cargando = true;
            try {
                var datos = await this.obtenerTodasLasFacturas();
                this.todasFacturasCache = datos;
                this.paginaVisible = 1;
            } catch (e) {
                console.error('Error al cargar facturas:', e);
            } finally {
                this.cargando = false;
            }
        },

        async obtenerTodasLasFacturas() {
            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Facturas-Get_Todas_Las_Facturas',
                    { Usuario: this.usuarioNombre },
                    'auto'
                );

                var datos = [];
                if (Array.isArray(resp.data)) {
                    datos = resp.data;
                } else if (resp.data && Array.isArray(resp.data.data)) {
                    datos = resp.data.data;
                }

                return datos;
            } catch (e) {
                console.error('Error al obtener facturas:', e);
                throw e;
            }
        },

        // ============================================
        // Ir a crear factura
        // ============================================
        irACrearFactura() {
            if (typeof GlobalVariables !== 'undefined' && GlobalVariables.loadModule) {
                GlobalVariables.loadModule('Facturas_BCA', {});
            } else {
                window.location.href = '../facturas_bca/facturas.html';
            }
        },

        // ============================================
        // Ver detalle
        // ============================================
        async verDetalle(factura) {
            this.pantallaAnterior = this.pantalla;
            this.facturaSeleccionada = factura;
            this.pantalla = 'detalle';

            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Facturas-Get_Facturas_Id',
                    { Id_Factura: factura.Id_Factura },
                    'auto'
                );

                var datos = [];
                if (Array.isArray(resp.data)) {
                    datos = resp.data;
                } else if (resp.data && Array.isArray(resp.data.data)) {
                    datos = resp.data.data;
                }

                if (datos.length > 0) {
                    var detalle = datos[0];
                    detalle.Id_Fiscal = factura.Id_Fiscal;
                    detalle.Nm_Cliente1 = factura.Nm_Cliente1;
                    detalle.Ap_Cliente1 = factura.Ap_Cliente1;
                    this.facturaSeleccionada = detalle;
                }
            } catch (e) {
                console.error('Error al cargar detalle:', e);
            }
        },

        // ============================================
        // Ver historial
        // ============================================
        async verHistorial(factura) {
            this.pantallaAnterior = this.pantalla;
            this.pantalla = 'historial';
            this.cargandoHistorial = true;
            this.historialFactura = [];

            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Facturas-Get_Facturas_Historial',
                    { Id_Factura: factura.Id_Factura },
                    'auto'
                );

                var datos = [];
                if (Array.isArray(resp.data)) {
                    datos = resp.data;
                } else if (resp.data && Array.isArray(resp.data.data)) {
                    datos = resp.data.data;
                }

                this.historialFactura = datos;

                if (datos.length === 0) {
                    this.mostrarSnackbar('Esta factura no tiene historial de cambios', 'blue', 'info');
                }

            } catch (e) {
                console.error('Error al cargar historial:', e);
                showError('No se pudo cargar el historial. Intente nuevamente.');
            } finally {
                this.cargandoHistorial = false;
            }
        },

        // ============================================
        // Editar factura
        // ============================================
        async editarFactura(factura) {
            this.pantallaAnterior = this.pantalla;

            // Limpiar formulario primero
            this.formFactura = {
                Id_Factura: null, Sucursal_Emisora: '', Numero_Factura: '',
                Secuencia_Factura: 1, Id_Cliente: null, Fecha_Emision: '',
                Valor_Factura: 0, Valor_Impuesto: 0, Base_Calculo: 0,
                Porcentaje_Impuesto: 19, Tipo_Factura: '', modalidad: '',
                Tipo_Servicio: '', Estado_Factura: '', Codigo_Ean_Fedex: '',
                observaciones: '', Motivo_Cambio: ''
            };

            this.pantalla = 'editar';

            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Facturas-Get_Facturas_Id',
                    { Id_Factura: factura.Id_Factura },
                    'auto'
                );

                console.log('=== Get_Facturas_Id respuesta ===', resp);

                var datos = [];
                if (Array.isArray(resp.data)) {
                    datos = resp.data;
                } else if (resp.data && Array.isArray(resp.data.data)) {
                    datos = resp.data.data;
                }

                console.log('datos detalle:', datos);

                if (datos.length > 0) {
                    var d = datos[0];
                    console.log('registro completo:', d);

                    // Reemplazar todo el formFactura de golpe para que Vue detecte el cambio
                    this.formFactura = {
                        Id_Factura: d.Id_Factura,
                        Sucursal_Emisora: d.Sucursal_Emisora || '',
                        Numero_Factura: d.Numero_Factura || '',
                        Secuencia_Factura: d.Secuencia_Factura || 1,
                        Id_Cliente: d.Id_Cliente,
                        Fecha_Emision: d.Fecha_Emision ? d.Fecha_Emision.toString().substring(0, 10) : '',
                        Valor_Factura: parseFloat(d.Valor_Factura) || 0,
                        Valor_Impuesto: parseFloat(d.Valor_Impuesto) || 0,
                        Base_Calculo: parseFloat(d.Base_Calculo) || 0,
                        Porcentaje_Impuesto: parseFloat(d.Porcentaje_Impuesto) || 19,
                        Tipo_Factura: d.Tipo_Factura || '',
                        modalidad: d.modalidad || '',
                        Tipo_Servicio: d.Tipo_Servicio || '',
                        Estado_Factura: d.Estado_Factura || '',
                        Codigo_Ean_Fedex: d.Codigo_Ean_Fedex || '',
                        observaciones: d.observaciones || '',
                        Motivo_Cambio: ''
                    };
                } else {
                    // Fallback con lo que trae el listado
                    this.formFactura = {
                        Id_Factura: factura.Id_Factura,
                        Sucursal_Emisora: factura.Sucursal_Emisora || '',
                        Numero_Factura: factura.Numero_Factura || '',
                        Secuencia_Factura: factura.Secuencia_Factura || 1,
                        Id_Cliente: factura.Id_Cliente,
                        Fecha_Emision: factura.Fecha_Emision ? factura.Fecha_Emision.toString().substring(0, 10) : '',
                        Valor_Factura: parseFloat(factura.Valor_Factura) || 0,
                        Valor_Impuesto: parseFloat(factura.Valor_Impuesto) || 0,
                        Base_Calculo: parseFloat(factura.Base_Calculo) || 0,
                        Porcentaje_Impuesto: parseFloat(factura.Porcentaje_Impuesto) || 19,
                        Tipo_Factura: factura.Tipo_Factura || '',
                        modalidad: factura.modalidad || '',
                        Tipo_Servicio: factura.Tipo_Servicio || '',
                        Estado_Factura: factura.Estado_Factura || '',
                        Codigo_Ean_Fedex: factura.Codigo_Ean_Fedex || '',
                        observaciones: factura.observaciones || '',
                        Motivo_Cambio: ''
                    };
                }
            } catch (e) {
                console.error('Error al cargar detalle para edicion:', e);
                showError('No se pudo cargar el detalle de la factura.');
                this.pantalla = this.pantallaAnterior;
            }
        },
        verDetalleHistorial(registro) {
            this.historialSeleccionado = registro;
            this.pantallaAnterior = this.pantalla;
            this.pantalla = 'detalle_historial';
        },

        cancelarEdicion() {
            this.pantalla = this.pantallaAnterior;
        },

        calcularImpuesto() {
            var base = parseFloat(this.formFactura.Base_Calculo || this.formFactura.Valor_Factura || 0);
            var porcentaje = parseFloat(this.formFactura.Porcentaje_Impuesto || 0);
            this.formFactura.Valor_Impuesto = (base * porcentaje / 100).toFixed(2);
        },

        async guardarFactura() {
            if (!this.formValido) {
                showError('Complete todos los campos obligatorios, incluyendo el motivo del cambio.');
                return;
            }

            this.guardando = true;

            try {
                await httpFunc(
                    '/generic/genericST/Facturas-Upd_Facturas',
                    {
                        Id_Factura: this.formFactura.Id_Factura,
                        Sucursal_Emisora: this.formFactura.Sucursal_Emisora,
                        Numero_Factura: this.formFactura.Numero_Factura,
                        Secuencia_Factura: this.formFactura.Secuencia_Factura,
                        Fecha_Emision: this.formFactura.Fecha_Emision,
                        Valor_Factura: this.formFactura.Valor_Factura,
                        Valor_Impuesto: this.formFactura.Valor_Impuesto,
                        Base_Calculo: this.formFactura.Base_Calculo || this.formFactura.Valor_Factura,
                        Porcentaje_Impuesto: this.formFactura.Porcentaje_Impuesto,
                        Tipo_Factura: this.formFactura.Tipo_Factura,
                        modalidad: this.formFactura.modalidad,
                        Tipo_Servicio: this.formFactura.Tipo_Servicio,
                        Estado_Factura: this.formFactura.Estado_Factura,
                        Codigo_ean_Fedex: this.formFactura.Codigo_Ean_Fedex || null,
                        observaciones: this.formFactura.observaciones || null,
                        Motivo_Cambio: this.formFactura.Motivo_Cambio,
                        usuario: this.usuarioNombre
                    },
                    'auto'
                );

                this.mostrarSnackbar('Factura actualizada exitosamente', 'green', 'check_circle');
                // Limpiar cache para forzar recarga completa
                this.todasFacturasCache = [];
                await this.cargarFacturas();
                this.pantalla = 'listado';

            } catch (e) {
                console.error('Error al guardar factura:', e);
                showError('Error al actualizar la factura. Intente nuevamente.');
            } finally {
                this.guardando = false;
            }
        }
    }
}
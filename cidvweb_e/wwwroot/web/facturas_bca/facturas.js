export default {
    el: '#facturaBcaDiv',
    data() {
        return {
            // Usuario
            usuarioNombre: 'Angie Gómez',
            usuarioIniciales: 'AG',
            sucursalNombre: 'FEDEX-BOG - Bogotá',
            menuUsuarioAbierto: false,

            // Wizard
            pasoActual: 0,
            steps: [
                { titulo: 'Cliente', completado: false },
                { titulo: 'Datos Factura', completado: false },
                { titulo: 'Valores', completado: false },
                { titulo: 'Confirmar', completado: false }
            ],

            // Cliente
            clienteSeleccionado: null,
            busquedaIdFiscal: '',
            buscando: false,

            // Factura
            factura: {
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
                Estado_Factura: 'GENERADA',
                Codigo_Ean_Fedex: '',
                observaciones: ''
            },

            // Estados
            emitiendo: false,

            // Snackbar
            snackbar: { mostrar: false, mensaje: '', tipo: '', icono: '' }
        };
    },

    computed: {
        paso2Valido() {
            return this.factura.Sucursal_Emisora.trim() !== '' &&
                this.factura.Numero_Factura.trim() !== '' &&
                this.factura.Fecha_Emision !== '' &&
                this.factura.Tipo_Factura !== '' &&
                this.factura.modalidad !== '' &&
                this.factura.Tipo_Servicio !== '';
        },

        paso3Valido() {
            return this.factura.Valor_Factura > 0;
        },

        valorTotal() {
            return parseFloat(this.factura.Valor_Factura || 0) + parseFloat(this.factura.Valor_Impuesto || 0);
        }
    },

    mounted() {
        // Fecha de hoy
        this.factura.Fecha_Emision = this.getFechaHoy();

        // Cargar usuario
        if (typeof GlobalVariables !== 'undefined' && GlobalVariables.userData) {
            this.usuarioNombre = GlobalVariables.userData.username || 'Usuario';
            this.usuarioIniciales = this.usuarioNombre.substring(0, 2).toUpperCase();
            this.sucursalNombre = GlobalVariables.userData.sucursal || 'FEDEX-BOG';

            // Pre-llenar sucursal
            this.factura.Sucursal_Emisora = this.sucursalNombre.split(' ')[0] || '';
        }

        // Cargar cliente desde localStorage (viene del módulo de clientes)
        var clienteStr = localStorage.getItem('bca_clienteActual');
        if (clienteStr) {
            try {
                this.clienteSeleccionado = JSON.parse(clienteStr);
                this.factura.Id_Cliente = this.clienteSeleccionado.Id_Cliente;
                this.steps[0].completado = true;
            } catch (e) {
                console.error('Error al cargar cliente:', e);
            }
        }
    },

    methods: {

        /* ─── UTILIDADES ─────────────────────────────────── */
        getFechaHoy() {
            var hoy = new Date();
            var year = hoy.getFullYear();
            var month = String(hoy.getMonth() + 1).padStart(2, '0');
            var day = String(hoy.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        },

        nombreCompletoCliente(c) {
            if (!c) return '';
            var partes = [c.Nm_Cliente1, c.Nm_Cliente2, c.Ap_Cliente1, c.Ap_Cliente2];
            return partes.filter(function (p) { return p && p.trim() !== ''; }).join(' ');
        },

        formatCOP(valor) {
            if (!valor) return 'COP$ 0,00';
            return 'COP$ ' + parseFloat(valor).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        mostrarSnackbar(mensaje, tipo, icono) {
            this.snackbar.mostrar = true;
            this.snackbar.mensaje = mensaje;
            this.snackbar.tipo = tipo;
            this.snackbar.icono = icono;
            setTimeout(() => { this.snackbar.mostrar = false; }, 4000);
        },

        toggleMenuUsuario() {
            this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
        },

        cerrarSesion() {
            if (typeof GlobalVariables !== 'undefined' && GlobalVariables.logOut) {
                GlobalVariables.logOut();
            } else {
                window.location.href = '/login.html';
            }
        },

        volverAClientes() {
            if (typeof GlobalVariables !== 'undefined' && GlobalVariables.loadModule) {
                GlobalVariables.loadModule('Clientes_BCA', {});
            } else {
                window.location.href = '../clientes_bca/clientes.html';
            }
        },

        cancelar() {
            if (confirm('¿Está seguro de cancelar? Se perderán los datos ingresados.')) {
                this.volverAClientes();
            }
        },

        /* ─── WIZARD NAVIGATION ──────────────────────────── */
        puedeIrAPaso(paso) {
            // Solo puede ir a pasos anteriores o al actual
            return paso <= this.pasoActual;
        },

        siguientePaso() {
            if (this.pasoActual < this.steps.length - 1) {
                this.steps[this.pasoActual].completado = true;
                this.pasoActual++;
            }
        },

        pasoAnterior() {
            if (this.pasoActual > 0) {
                this.pasoActual--;
            }
        },

        /* ─── BUSCAR CLIENTE ─────────────────────────────── */
        async buscarCliente() {
            if (!this.busquedaIdFiscal.trim()) return;

            this.buscando = true;
            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Clientes-Get_Clientes',
                    {
                        Id_Fiscal: this.busquedaIdFiscal.trim(),
                        Filtro_Nombre: null,
                        Usuario: this.usuarioNombre
                    },
                    'auto'
                );

                var datos = Array.isArray(resp.data) ? resp.data : [];

                if (datos.length === 0) {
                    showError('Cliente no encontrado. Verifique el ID Fiscal o regístrese en el módulo de Clientes.');
                } else {
                    this.clienteSeleccionado = datos[0];
                    this.factura.Id_Cliente = datos[0].Id_Cliente;
                    localStorage.setItem('bca_clienteActual', JSON.stringify(datos[0]));
                    this.mostrarSnackbar('Cliente encontrado correctamente', 'green', 'check_circle');
                }
            } catch (e) {
                console.error('Error al buscar cliente:', e);
                showError('Error al buscar el cliente. Intente nuevamente.');
            } finally {
                this.buscando = false;
            }
        },

        /* ─── CALCULAR IMPUESTO ──────────────────────────── */
        calcularImpuesto() {
            var base = parseFloat(this.factura.Base_Calculo || this.factura.Valor_Factura || 0);
            var porcentaje = parseFloat(this.factura.Porcentaje_Impuesto || 0);
            this.factura.Valor_Impuesto = (base * porcentaje / 100).toFixed(2);
        },

        /* ─── EMITIR FACTURA ─────────────────────────────── */
        async emitirFactura() {
            if (!this.clienteSeleccionado) {
                showError('No hay un cliente seleccionado.');
                return;
            }

            if (!this.paso2Valido || !this.paso3Valido) {
                showError('Complete todos los campos obligatorios.');
                return;
            }

            this.emitiendo = true;

            try {
                var resp = await httpFunc(
                    '/generic/genericST/Facturas-Ins_Facturas',
                    {
                        Sucursal_Emisora: this.factura.Sucursal_Emisora,
                        Numero_Factura: this.factura.Numero_Factura,
                        Secuencia_Factura: this.factura.Secuencia_Factura,
                        Id_Cliente: this.factura.Id_Cliente,
                        Fecha_Emision: this.factura.Fecha_Emision,
                        Valor_Factura: this.factura.Valor_Factura,
                        Valor_Impuesto: this.factura.Valor_Impuesto,
                        Base_Calculo: this.factura.Base_Calculo || this.factura.Valor_Factura,
                        Porcentaje_Impuesto: this.factura.Porcentaje_Impuesto,
                        Tipo_Factura: this.factura.Tipo_Factura,
                        modalidad: this.factura.modalidad,
                        Tipo_Servicio: this.factura.Tipo_Servicio,
                        Estado_Factura: this.factura.Estado_Factura,
                        Codigo_ean_Fedex: this.factura.Codigo_Ean_Fedex || null,
                        observaciones: this.factura.observaciones || null,
                        usuario: this.usuarioNombre
                    },
                    'auto'
                );

                showSuccess('¡Factura emitida exitosamente! N° ' + this.factura.Numero_Factura);

                // Esperar un momento y volver a clientes
                setTimeout(() => {
                    this.volverAClientes();
                }, 2000);

            } catch (e) {
                console.error('Error al emitir factura:', e);
                showError('Error al emitir la factura: ' + (e.message || 'Intente nuevamente.'));
            } finally {
                this.emitiendo = false;
            }
        }
    }
};

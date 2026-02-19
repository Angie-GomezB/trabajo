export default {
    el: '#clientesBcaDiv',

    data() {
        return {
            // Usuario
            sucursalNombre: 'FEDEX-BOG - Bogotá',

            pantalla: 'buscar',
            pantallaAnterior: 'buscar',
            filtroIdFiscal: '',
            filtroNombre: '',
            clienteActual: null,
            todosClientes: [],
            todosClientesCache: [],
            cargando: false,
            cargandoTodos: false,
            guardando: false,

            // ── Scroll infinito ──────────────────────────────────────────
            paginaVisible: 1,       // cuántas "páginas" de 20 se muestran
            tamanioPagina: 20,      // registros por lote
            cargandoMas: false,     // indicador de carga dentro de la tabla
            // ─────────────────────────────────────────────────────────────

            form: {
                Id_Cliente: null,
                Id_Fiscal: '',
                Nm_Cliente1: '',
                Nm_Cliente2: '',
                Ap_Cliente1: '',
                Ap_Cliente2: '',
                email: '',
                telefono: '',
                direccion: '',
                ciudad: '',
                activo: true
            },
            // historial de facturas
            facturasCliente: [],
            cargandoFacturas: false,
            facturaSeleccionada: null,
            guardandoFactura: false,
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
                observaciones: ''
            },
            snackbar: { mostrar: false, mensaje: '', tipo: '', icono: '' }
        };
    },

    computed: {
        formularioValido() {
            return this.form.Id_Fiscal.trim() !== '' &&
                this.form.Nm_Cliente1.trim() !== '' &&
                this.form.Ap_Cliente1.trim() !== '' &&
                this.form.telefono.trim() !== '' &&
                this.form.email.trim() !== '';
        },

        formFacturaValido() {
            return this.formFactura.Sucursal_Emisora.trim() !== '' &&
                this.formFactura.Numero_Factura.trim() !== '' &&
                this.formFactura.Fecha_Emision !== '' &&
                this.formFactura.Tipo_Factura !== '' &&
                this.formFactura.modalidad !== '' &&
                this.formFactura.Tipo_Servicio !== '' &&
                this.formFactura.Valor_Factura > 0;
        },

        valorTotalFactura() {
            return parseFloat(this.formFactura.Valor_Factura || 0) + parseFloat(this.formFactura.Valor_Impuesto || 0);
        },

        // ── Lista filtrada por los inputs del encabezado ─────────────────
        clientesFiltrados() {
            return this.filtrarClientesLocal(
                this.todosClientesCache,
                this.filtroIdFiscal,
                this.filtroNombre
            );
        },

        // ── Sólo los registros visibles (scroll infinito) ────────────────
        clientesVisibles() {
            return this.clientesFiltrados.slice(0, this.paginaVisible * this.tamanioPagina);
        }
    },

    mounted() {
        var clienteStr = localStorage.getItem('bca_clienteActual');
        if (clienteStr) {
            try {
                this.clienteActual = JSON.parse(clienteStr);
                this.pantalla = 'buscar';
            } catch (e) {
                this.pantalla = 'buscar';
            }
        }

        // Cargar clientes al arrancar en pantalla principal
        if (this.pantalla === 'buscar') {
            this.cargarClientesIniciales();
        }
    },

    methods: {

        nombreCompleto(c) {
            if (!c) return '';
            var partes = [c.Nm_Cliente1, c.Nm_Cliente2, c.Ap_Cliente1, c.Ap_Cliente2];
            return partes.filter(function (p) { return p && p.trim() !== ''; }).join(' ');
        },

        esActivo(c) {
            return c.activo == true || c.activo === 1 || c.activo === 'True' || c.activo === 'true';
        },

        mostrarSnackbar(mensaje, tipo, icono) {
            this.snackbar.mostrar = true;
            this.snackbar.mensaje = mensaje;
            this.snackbar.tipo = tipo;
            this.snackbar.icono = icono;
            setTimeout(() => { this.snackbar.mostrar = false; }, 4000);
        },

        volverABuscar() {
            this.pantalla = 'buscar';
            this.filtroIdFiscal = '';
            this.filtroNombre = '';
            this.paginaVisible = 1;
            this.clienteActual = null;
            localStorage.removeItem('bca_clienteActual');
            // Recargar si el cache está vacío
            if (this.todosClientesCache.length === 0) {
                this.cargarClientesIniciales();
            }
        },

        // ============================================
        // Carga inicial de clientes en pantalla buscar
        // ============================================
        async cargarClientesIniciales() {
            this.cargandoTodos = true;
            try {
                var datos = await this.obtenerTodosLosClientes();
                this.todosClientesCache = datos;
                this.paginaVisible = 1;
            } catch (e) {
                console.error('Error al cargar clientes iniciales:', e);
            } finally {
                this.cargandoTodos = false;
            }
        },

        // ============================================
        // Scroll infinito dentro de la tabla
        // ============================================
        onScrollTabla(event) {
            var el = event.target;
            var umbral = 80; // px antes del final para disparar carga
            var llegaAlFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - umbral;

            if (llegaAlFinal && !this.cargandoMas) {
                var totalFiltrado = this.clientesFiltrados.length;
                var totalVisible = this.clientesVisibles.length;

                if (totalVisible < totalFiltrado) {
                    this.cargandoMas = true;
                    // Simular un pequeño delay para suavizar la carga
                    setTimeout(() => {
                        this.paginaVisible += 1;
                        this.cargandoMas = false;
                    }, 200);
                }
            }
        },

        // ============================================
        // Aplicar filtros (reset paginación al filtrar)
        // ============================================
        aplicarFiltros() {
            this.paginaVisible = 1;
            // Resetear scroll al inicio al cambiar filtros
            var tablaEl = document.getElementById('tablaClientesScroll');
            if (tablaEl) tablaEl.scrollTop = 0;
        },

        // ============================================
        // Obtener todos los clientes
        // ============================================
        async obtenerTodosLosClientes() {
            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Clientes-Get_Todos_Los_Clientes',
                    { Usuario: 'angie' },
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
                console.error('Error al obtener todos los clientes:', e);
                throw e;
            }
        },

        // ============================================
        // Filtrar clientes localmente
        // ============================================
        filtrarClientesLocal(clientes, idFiscal, nombre) {
            var resultados = clientes;

            if (idFiscal && idFiscal.trim() !== '') {
                var idBuscar = idFiscal.trim().toLowerCase();
                resultados = resultados.filter(function (c) {
                    return c.Id_Fiscal && c.Id_Fiscal.toLowerCase().indexOf(idBuscar) >= 0;
                });
            }

            if (nombre && nombre.trim() !== '') {
                var nombreBuscar = nombre.trim().toLowerCase();

                resultados = resultados.filter(function (c) {
                    var nm1 = (c.Nm_Cliente1 || '').toLowerCase();
                    var nm2 = (c.Nm_Cliente2 || '').toLowerCase();
                    var ap1 = (c.Ap_Cliente1 || '').toLowerCase();
                    var ap2 = (c.Ap_Cliente2 || '').toLowerCase();

                    var nombreCompleto = (nm1 + ' ' + nm2 + ' ' + ap1 + ' ' + ap2).toLowerCase();

                    if (nombreCompleto.indexOf(nombreBuscar) >= 0) {
                        return true;
                    }

                    return nm1.indexOf(nombreBuscar) >= 0 ||
                        nm2.indexOf(nombreBuscar) >= 0 ||
                        ap1.indexOf(nombreBuscar) >= 0 ||
                        ap2.indexOf(nombreBuscar) >= 0;
                });
            }

            return resultados;
        },

        // ============================================
        // buscarCliente — mantenido por compatibilidad
        // (ya no navega a pantalla 'todos', el filtrado
        //  es reactivo en la misma pantalla 'buscar')
        // ============================================
        async buscarCliente() {
            // El filtrado es reactivo via computed clientesFiltrados.
            // Este método queda disponible por si se llama desde otro lugar.
            this.aplicarFiltros();
        },

        irAFacturas() {
            if (this.clienteActual) {
                localStorage.setItem('bca_clienteActual', JSON.stringify(this.clienteActual));
            }
            GlobalVariables.loadModule('Facturas_BCA', {});
        },

        abrirFormularioNuevo() {
            this.pantallaAnterior = this.pantalla;
            this.form = {
                Id_Cliente: null,
                Id_Fiscal: this.filtroIdFiscal.trim(),
                Nm_Cliente1: '',
                Nm_Cliente2: '',
                Ap_Cliente1: '',
                Ap_Cliente2: '',
                email: '',
                telefono: '',
                direccion: '',
                ciudad: '',
                activo: true
            };
            this.pantalla = 'formulario_nuevo';
        },

        abrirFormularioEditar(cliente) {
            this.pantallaAnterior = this.pantalla;
            this.form = {
                Id_Cliente: cliente.Id_Cliente,
                Id_Fiscal: cliente.Id_Fiscal,
                Nm_Cliente1: cliente.Nm_Cliente1 || '',
                Nm_Cliente2: cliente.Nm_Cliente2 || '',
                Ap_Cliente1: cliente.Ap_Cliente1 || '',
                Ap_Cliente2: cliente.Ap_Cliente2 || '',
                email: cliente.email || '',
                telefono: cliente.telefono || '',
                direccion: cliente.direccion || '',
                ciudad: cliente.ciudad || '',
                activo: this.esActivo(cliente)
            };
            this.pantalla = 'formulario_editar';
        },

        cancelarFormulario() {
            if (this.pantalla === 'formulario_nuevo' && this.pantallaAnterior === 'no_encontrado') {
                this.pantalla = 'buscar';
            } else {
                this.pantalla = this.pantallaAnterior;
            }
        },

        async guardarCliente() {
            if (!this.formularioValido) return;
            this.guardando = true;

            try {
                if (this.pantalla === 'formulario_nuevo') {
                    var clientesParaCheck = this.todosClientesCache.length > 0
                        ? this.todosClientesCache
                        : await this.obtenerTodosLosClientes();

                    var existentes = clientesParaCheck.filter(function (c) {
                        return c.Id_Fiscal === this.form.Id_Fiscal.trim();
                    }.bind(this));

                    if (existentes.length > 0) {
                        showError('Error: Ya existe un cliente registrado con ese ID Fiscal.');
                        this.guardando = false;
                        return;
                    }

                    console.log("ANTES DE INSERTAR:", this.form);

                    await httpFunc(
                        '/generic/genericST/Clientes-Ins_Clientes',
                        {
                            Id_Fiscal: this.form.Id_Fiscal.trim(),
                            Nm_Cliente1: this.form.Nm_Cliente1.trim(),
                            Nm_Cliente2: this.form.Nm_Cliente2.trim() !== '' ? this.form.Nm_Cliente2.trim() : null,
                            Ap_Cliente1: this.form.Ap_Cliente1.trim(),
                            Ap_Cliente2: this.form.Ap_Cliente2.trim() !== '' ? this.form.Ap_Cliente2.trim() : null,
                            email: this.form.email.trim(),
                            telefono: this.form.telefono.trim(),
                            direccion: this.form.direccion.trim() !== '' ? this.form.direccion.trim() : null,
                            ciudad: this.form.ciudad.trim() !== '' ? this.form.ciudad.trim() : null,
                            usuario: 'angie'
                        },
                        'auto'
                    );

                    this.mostrarSnackbar('Cliente creado exitosamente.', 'green', 'check_circle');

                    this.todosClientesCache = [];

                    var todosActualizados = await this.obtenerTodosLosClientes();
                    this.todosClientesCache = todosActualizados;

                    var nuevos = todosActualizados.filter(function (c) {
                        return c.Id_Fiscal === this.form.Id_Fiscal.trim();
                    }.bind(this));

                    if (nuevos.length > 0) {
                        this.clienteActual = nuevos[0];
                        localStorage.setItem('bca_clienteActual', JSON.stringify(nuevos[0]));
                    }
                    this.pantalla = 'buscar';

                } else {
                    await httpFunc(
                        '/generic/genericST/Clientes-Upd_Clientes',
                        {
                            Id_Cliente: this.form.Id_Cliente,
                            Nm_Cliente1: this.form.Nm_Cliente1.trim(),
                            Nm_Cliente2: this.form.Nm_Cliente2.trim() !== '' ? this.form.Nm_Cliente2.trim() : null,
                            Ap_Cliente1: this.form.Ap_Cliente1.trim(),
                            Ap_Cliente2: this.form.Ap_Cliente2.trim() !== '' ? this.form.Ap_Cliente2.trim() : null,
                            email: this.form.email.trim(),
                            telefono: this.form.telefono.trim(),
                            direccion: this.form.direccion.trim() !== '' ? this.form.direccion.trim() : null,
                            ciudad: this.form.ciudad.trim() !== '' ? this.form.ciudad.trim() : null,
                            activo: this.form.activo,
                            usuario: 'angie'
                        },
                        'auto'
                    );

                    this.mostrarSnackbar('Cliente actualizado correctamente.', 'green', 'check_circle');

                    this.todosClientesCache = [];

                    var todosActualizados = await this.obtenerTodosLosClientes();
                    this.todosClientesCache = todosActualizados;

                    var actualizados = todosActualizados.filter(function (c) {
                        return c.Id_Cliente === this.form.Id_Cliente;
                    }.bind(this));

                    if (actualizados.length > 0) {
                        var clienteActualizado = actualizados[0];
                        // Siempre volver a buscar (ya no existe pantalla 'todos')
                        this.clienteActual = clienteActualizado;
                        localStorage.setItem('bca_clienteActual', JSON.stringify(clienteActualizado));
                        this.pantalla = 'buscar';
                    }
                }

            } catch (e) {
                console.error('Error al guardar cliente:', e);
                showError('Error al guardar el cliente. Intente nuevamente.');
            } finally {
                this.guardando = false;
            }
        },

        // ============================================
        // Ver historial de facturas
        // ============================================
        async verHistorialFacturas() {
            if (!this.clienteActual) return;

            this.pantallaAnterior = this.pantalla;
            this.pantalla = 'historial_facturas';
            this.cargandoFacturas = true;
            this.facturasCliente = [];

            try {
                console.log('=== Cargando facturas del cliente ===');
                console.log('Id_Cliente:', this.clienteActual.Id_Cliente);

                var resp = await httpFunc(
                    '/generic/genericDT/Facturas-Get_Facturas',
                    {
                        Id_Cliente: this.clienteActual.Id_Cliente,
                        Usuario: 'angie'
                    },
                    'auto'
                );

                console.log('Respuesta completa:', resp);

                var datos = [];
                if (Array.isArray(resp.data)) {
                    datos = resp.data;
                } else if (resp.data && Array.isArray(resp.data.data)) {
                    datos = resp.data.data;
                } else if (resp && Array.isArray(resp)) {
                    datos = resp;
                }

                console.log('Total de facturas obtenidas:', datos.length);
                console.log('Muestra de datos:', datos.slice(0, 2));

                this.facturasCliente = datos;

                console.log('Facturas encontradas:', this.facturasCliente.length);

                if (this.facturasCliente.length > 0) {
                    this.mostrarSnackbar('Se encontraron ' + this.facturasCliente.length + ' facturas', 'green', 'check_circle');
                } else {
                    this.mostrarSnackbar('No hay facturas para este cliente', 'blue', 'info');
                }

            } catch (e) {
                console.error('❌ Error al cargar facturas:', e);
                console.error('Error detallado:', JSON.stringify(e, null, 2));
                console.error('Stack:', e.stack);

                if (e.response) {
                    console.error('Respuesta del servidor:', e.response);
                    console.error('Status:', e.response.status);
                    console.error('Data:', e.response.data);
                }

                showError('No se pudo cargar el historial. Puede que el stored procedure Facturas-Get_Facturas no exista en la base de datos.');
                this.facturasCliente = [];
            } finally {
                this.cargandoFacturas = false;
            }
        },

        formatCOP(valor) {
            if (!valor) return 'COP$ 0,00';
            return 'COP$ ' + parseFloat(valor).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatFecha(fecha) {
            if (!fecha) return '-';
            var d = new Date(fecha);
            return d.toLocaleDateString('es-CO');
        },

        volverDeHistorial() {
            this.pantalla = this.pantallaAnterior;
        },

        // ============================================
        // Ver detalle de factura
        // ============================================
        verDetalleFactura(factura) {
            this.facturaSeleccionada = factura;
            this.pantallaAnterior = this.pantalla;
            this.pantalla = 'detalle_factura';
        },

        // ============================================
        // Editar factura
        // ============================================
        editarFactura(factura) {
            this.pantallaAnterior = this.pantalla;
            this.formFactura = {
                Id_Factura: factura.Id_Factura,
                Sucursal_Emisora: factura.Sucursal_Emisora || '',
                Numero_Factura: factura.Numero_Factura || '',
                Secuencia_Factura: factura.Secuencia_Factura || 1,
                Id_Cliente: factura.Id_Cliente,
                Fecha_Emision: factura.Fecha_Emision ? factura.Fecha_Emision.split('T')[0] : '',
                Valor_Factura: factura.Valor_Factura || 0,
                Valor_Impuesto: factura.Valor_Impuesto || 0,
                Base_Calculo: factura.Base_Calculo || 0,
                Porcentaje_Impuesto: factura.Porcentaje_Impuesto || 19,
                Tipo_Factura: factura.Tipo_Factura || '',
                modalidad: factura.modalidad || '',
                Tipo_Servicio: factura.Tipo_Servicio || '',
                Estado_Factura: factura.Estado_Factura || '',
                Codigo_Ean_Fedex: factura.Codigo_Ean_Fedex || '',
                observaciones: factura.observaciones || ''
            };
            this.pantalla = 'editar_factura';
        },

        calcularImpuestoFactura() {
            var base = parseFloat(this.formFactura.Base_Calculo || this.formFactura.Valor_Factura || 0);
            var porcentaje = parseFloat(this.formFactura.Porcentaje_Impuesto || 0);
            this.formFactura.Valor_Impuesto = (base * porcentaje / 100).toFixed(2);
        },

        cancelarEdicionFactura() {
            this.pantalla = this.pantallaAnterior;
        },

        async guardarFactura() {
            if (!this.formFacturaValido) {
                showError('Por favor complete todos los campos obligatorios');
                return;
            }

            this.guardandoFactura = true;

            try {
                await httpFunc(
                    '/generic/genericST/Facturas-Upd_Facturas',
                    {
                        Id_Factura: this.formFactura.Id_Factura,
                        Sucursal_Emisora: this.formFactura.Sucursal_Emisora,
                        Numero_Factura: this.formFactura.Numero_Factura,
                        Secuencia_Factura: this.formFactura.Secuencia_Factura,
                        Id_Cliente: this.formFactura.Id_Cliente,
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
                        usuario: 'angie'
                    },
                    'auto'
                );

                this.mostrarSnackbar('Factura actualizada exitosamente', 'green', 'check_circle');

                // Recargar el historial
                await this.verHistorialFacturas();

            } catch (e) {
                console.error('Error al actualizar factura:', e);
                showError('Error al actualizar la factura. Intente nuevamente.');
            } finally {
                this.guardandoFactura = false;
            }
        }
    }
};
export default {
    el: '#facturasBcaDiv',
    data() {
        return {
            // Usuario
            sucursalNombre: 'FEDEX-BOG - Bogotá',
            menuUsuarioAbierto: false,

            // Cliente
            clienteSeleccionado: null,
            busquedaIdFiscal: '',
            buscando: false,

            // ── Cache acumulativo + Sugerencias ──────────────────────
            // Guardamos todos los clientes que la API nos ha devuelto
            // en cualquier búsqueda previa. Así filtramos localmente
            // con startsWith sin necesidad de tocar el SQL.
            cacheAcumulativo: {},       // { "1": [cliente,...], "12": [...] }
            sugerenciasFiltradas: [],
            mostrarSugerencias: false,
            cargandoSugerencias: false,
            maxSugerencias: 10,
            hayMasSugerencias: false,
            _debounceTimer: null,
            // ─────────────────────────────────────────────────────────

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

            emitiendo: false,
            snackbar: { mostrar: false, mensaje: '', tipo: '', icono: '' }
        };
    },

    computed: {
        formularioValido() {
            return this.clienteSeleccionado !== null &&
                this.factura.Sucursal_Emisora.trim() !== '' &&
                this.factura.Numero_Factura.trim() !== '' &&
                this.factura.Fecha_Emision !== '' &&
                this.factura.Tipo_Factura !== '' &&
                this.factura.modalidad !== '' &&
                this.factura.Tipo_Servicio !== '' &&
                this.factura.Valor_Factura > 0;
        },
        valorTotal() {
            return parseFloat(this.factura.Valor_Factura || 0) + parseFloat(this.factura.Valor_Impuesto || 0);
        }
    },

    mounted() {
        this.factura.Fecha_Emision = this.getFechaHoy();

        if (typeof GlobalVariables !== 'undefined' && GlobalVariables.userData) {
            this.usuarioNombre = GlobalVariables.userData.username || 'Usuario';
            this.usuarioIniciales = this.usuarioNombre.substring(0, 2).toUpperCase();
            this.sucursalNombre = GlobalVariables.userData.sucursal || 'FEDEX-BOG';
            this.factura.Sucursal_Emisora = this.sucursalNombre.split(' ')[0] || '';
        }

        var clienteStr = localStorage.getItem('bca_clienteActual');
        if (clienteStr) {
            try {
                this.clienteSeleccionado = JSON.parse(clienteStr);
                this.factura.Id_Cliente = this.clienteSeleccionado.Id_Cliente;
            } catch (e) {
                console.error('Error al cargar cliente:', e);
            }
        }
    },

    methods: {

        /* ─── UTILIDADES ─────────────────────────────────── */
        getFechaHoy() {
            var hoy = new Date();
            return hoy.getFullYear() + '-' +
                String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
                String(hoy.getDate()).padStart(2, '0');
        },

        nombreCompletoCliente(c) {
            if (!c) return '';
            return [c.Nm_Cliente1, c.Nm_Cliente2, c.Ap_Cliente1, c.Ap_Cliente2]
                .filter(p => p && p.trim() !== '').join(' ');
        },

        formatCOP(valor) {
            if (!valor) return 'COP$ 0,00';
            return 'COP$ ' + parseFloat(valor).toLocaleString('es-CO', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            });
        },

        mostrarSnackbar(mensaje, tipo, icono) {
            this.snackbar = { mostrar: true, mensaje, tipo, icono };
            setTimeout(() => { this.snackbar.mostrar = false; }, 4000);
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

        limpiarCliente() {
            this.clienteSeleccionado = null;
            this.factura.Id_Cliente = null;
            this.busquedaIdFiscal = '';
            this.sugerenciasFiltradas = [];
            this.mostrarSugerencias = false;
            localStorage.removeItem('bca_clienteActual');
        },

        /* ─── EVENTOS DEL INPUT ──────────────────────────── */
        onInputIdFiscal() {
            const q = this.busquedaIdFiscal.trim();

            if (!q) {
                this.sugerenciasFiltradas = [];
                this.mostrarSugerencias = false;
                this.hayMasSugerencias = false;
                this.cargandoSugerencias = false;
                clearTimeout(this._debounceTimer);
                return;
            }

            // Intentar filtrar desde el cache acumulativo primero (respuesta instantánea)
            this.filtrarDesdeCache(q);

            // Siempre lanzar llamada a la API con debounce para el ID exacto
            // (por si el exact-match trae datos que aún no están en cache)
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => {
                this.fetchYAgregarAlCache(q);
            }, 350);
        },

        onFocusIdFiscal() {
            if (this.busquedaIdFiscal.trim() && this.sugerenciasFiltradas.length > 0) {
                this.mostrarSugerencias = true;
            }
        },

        onBlurIdFiscal() {
            setTimeout(() => {
                this.mostrarSugerencias = false;
                this.cargandoSugerencias = false;
            }, 250);
        },

        /* ─── FILTRAR DESDE CACHE LOCAL (startsWith) ─────────
           Recorre TODOS los clientes que hemos guardado en el
           cache acumulativo y muestra los que empiezan con `q`.
           Esto es instantáneo y no hace ninguna llamada a la API.
        ─────────────────────────────────────────────────── */
        filtrarDesdeCache(q) {
            // Recolectar todos los clientes únicos del cache
            const vistos = new Set();
            const todos = [];
            for (const lista of Object.values(this.cacheAcumulativo)) {
                for (const c of lista) {
                    const key = c.Id_Fiscal;
                    if (!vistos.has(key)) {
                        vistos.add(key);
                        todos.push(c);
                    }
                }
            }

            // Filtrar con startsWith
            const coincidencias = todos.filter(c =>
                c.Id_Fiscal &&
                c.Id_Fiscal.toString().toLowerCase().startsWith(q.toLowerCase())
            );

            this.hayMasSugerencias = coincidencias.length > this.maxSugerencias;
            this.sugerenciasFiltradas = coincidencias
                .slice(0, this.maxSugerencias)
                .map(c => ({
                    Id_Fiscal: c.Id_Fiscal,
                    nombre: this.nombreCompletoCliente(c),
                    _raw: c
                }));

            this.mostrarSugerencias = true;
        },

        /* ─── FETCH + AGREGAR AL CACHE ACUMULATIVO ───────────
           Llama a la API con el valor exacto escrito.
           El SP devuelve el exact-match de ese ID.
           Guardamos el resultado en el cache para que los
           siguientes startsWith lo encuentren sin más llamadas.
        ─────────────────────────────────────────────────── */
        async fetchYAgregarAlCache(q) {
            // Si ya tenemos este prefijo exacto en cache, no llamar de nuevo
            if (this.cacheAcumulativo[q] !== undefined) return;

            this.cargandoSugerencias = true;
            try {
                var resp = await httpFunc(
                    '/generic/genericDT/Clientes-Get_Clientes',
                    {
                        Id_Fiscal: q,
                        Filtro_Nombre: null,
                        Usuario: this.usuarioNombre
                    },
                    'auto'
                );

                var datos = Array.isArray(resp.data) ? resp.data : [];

                // Guardar en cache (aunque venga vacío, para no repetir la llamada)
                this.cacheAcumulativo[q] = datos;

                // Si el input no cambió mientras esperábamos, refrescar la lista
                if (q === this.busquedaIdFiscal.trim()) {
                    this.filtrarDesdeCache(q);
                }

            } catch (e) {
                console.warn('Error al buscar sugerencias:', e);
                this.cacheAcumulativo[q] = [];
            } finally {
                this.cargandoSugerencias = false;
            }
        },

        /* ─── SELECCIONAR SUGERENCIA ─────────────────────── */
        // Al hacer clic: completa el campo con el ID seleccionado.
        // El usuario puede entonces presionar BUSCAR CLIENTE para confirmar.
        seleccionarSugerencia(item) {
            this.busquedaIdFiscal = item.Id_Fiscal;
            this.mostrarSugerencias = false;
            this.sugerenciasFiltradas = [];
            clearTimeout(this._debounceTimer);

            // Si tenemos el objeto completo lo cargamos directamente
            if (item._raw) {
                this.clienteSeleccionado = item._raw;
                this.factura.Id_Cliente = item._raw.Id_Cliente;
                localStorage.setItem('bca_clienteActual', JSON.stringify(item._raw));
                this.mostrarSnackbar('Cliente seleccionado: ' + item.nombre, 'green', 'check_circle');
            } else {
                this.buscarCliente();
            }
        },

        /* ─── BUSCAR CLIENTE (botón) ─────────────────────── */
        async buscarCliente() {
            if (!this.busquedaIdFiscal.trim()) return;

            this.mostrarSugerencias = false;
            this.sugerenciasFiltradas = [];
            clearTimeout(this._debounceTimer);

            // Si ya fue seleccionado desde el dropdown no hace falta buscar de nuevo
            if (this.clienteSeleccionado &&
                this.clienteSeleccionado.Id_Fiscal === this.busquedaIdFiscal.trim()) {
                return;
            }

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
                    // También guardar en cache para futuras búsquedas
                    this.cacheAcumulativo[datos[0].Id_Fiscal] = [datos[0]];
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
            this.factura.Valor_Impuesto = parseFloat((base * porcentaje / 100).toFixed(2));
        },

        /* ─── EMITIR FACTURA ─────────────────────────────── */
        async emitirFactura() {
            if (!this.clienteSeleccionado) {
                showError('No hay un cliente seleccionado.');
                return;
            }
            if (!this.formularioValido) {
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
                setTimeout(() => { this.volverAClientes(); }, 2000);

            } catch (e) {
                console.error('Error al emitir factura:', e);
                showError('Error al emitir la factura: ' + (e.message || 'Intente nuevamente.'));
            } finally {
                this.emitiendo = false;
            }
        }
    }
};
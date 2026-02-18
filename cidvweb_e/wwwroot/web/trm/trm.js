export default {
    el: '#trmDiv',
    data() {
        return {
            datos: [],
            cargando: false,
            error: null,
            snackbar: {
                mostrar: false,
                mensaje: '',
                tipo: '',
                icono: ''
            }
        };
    },
    computed: {
        ultimaTRM() {
            if (this.datos.length === 0) return '-';
            return this.datos[0].trm;
        }
    },
    mounted() {
        this.cargarDatos();
    },
    methods: {
        mostrarSnackbar(mensaje, tipo, icono) {
            this.snackbar.mostrar = true;
            this.snackbar.mensaje = mensaje;
            this.snackbar.tipo = tipo;
            this.snackbar.icono = icono;
            setTimeout(() => {
                this.snackbar.mostrar = false;
            }, 3000);
        },

        async cargarDatos() {
            this.cargando = true;
            this.error = null;

            try {
                // 🎯 USANDO AXIOS
                const response = await axios.get('/trm/consultar');

                // Axios ya parsea el JSON automáticamente en response.data
                const data = response.data;

                console.log('Datos TRM recibidos con Axios:', data);

                if (data && data.datos && Array.isArray(data.datos)) {
                    this.datos = data.datos;
                    this.mostrarSnackbar(
                        `✅ ${data.total} registros cargados`,
                        'green',
                        'check_circle'
                    );
                } else {
                    this.datos = [];
                    this.mostrarSnackbar(
                        '⚠️ No hay datos disponibles',
                        'amber',
                        'warning'
                    );
                }

            } catch (err) {
                console.error('Error completo:', err);

                // Manejo de errores específico de Axios
                let mensajeError = 'Error desconocido';
                if (err.response) {
                    // El servidor respondió con un código de error (4xx, 5xx)
                    mensajeError = `Error ${err.response.status}: ${err.response.statusText}`;
                } else if (err.request) {
                    // La petición se hizo pero no hubo respuesta
                    mensajeError = 'No se pudo conectar con el servidor';
                } else {
                    // Algo pasó al configurar la petición
                    mensajeError = err.message;
                }

                this.error = 'Error al cargar los datos: ' + mensajeError;
                this.mostrarSnackbar(
                    '❌ Error al cargar datos',
                    'red',
                    'error'
                );
            } finally {
                this.cargando = false;
            }
        },

        formatearFecha(fecha) {
            if (!fecha) return '-';

            // La fecha viene como "2026-01-27T15:59:00" o "2026-01-27 15:59:00"
            let fechaLimpia = fecha.replace('T', ' ');

            // Si tiene milisegundos, los quitamos
            if (fechaLimpia.includes('.')) {
                fechaLimpia = fechaLimpia.split('.')[0];
            }

            // Tomar solo hasta los minutos (YYYY-MM-DD HH:MM)
            fechaLimpia = fechaLimpia.substring(0, 16);

            // Formatear bonito: DD/MM/YYYY HH:MM
            const partes = fechaLimpia.split(' ');
            const [año, mes, dia] = partes[0].split('-');
            const hora = partes[1];

            return `${dia}/${mes}/${año} ${hora}`;
        },

        volver() {
            window.history.back();
        }
    }
};
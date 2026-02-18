export default {
    data() {
        return {
            
        }
    }, 
    async mounted() {
        this.getCuentas();
    },
    methods: {
        async getCuentas() {
            showProgress();
            var resp = await httpFunc("/generic/genericDT/Clientes-Get_Clientes", {"Cuenta": ""}, "auto");
            hideProgress();
            console.log(resp);
        }
    }
}
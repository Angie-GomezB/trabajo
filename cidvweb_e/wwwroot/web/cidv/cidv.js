export default {
    data() {
        return {
            
        }
    }, 
    async mounted() {
        this.getCuentas();
    },
    methods: {
        getCuentas() {
            showProgress();
            var resp = await httpFunc("/generic/genericDT/Cliente-Get_Clientes", {}, "auto");
            hideProgress();
            console.log();
        }
    }
}
export default {
    data() {
        return {
            mode: 0,
            users: [],
            roles: [],
            userFilter: { "username": "", next: true, page: 0},
            progress: { p0: false },
            newUser: {
                "username": "",
                "email": "",
                "password": "",
                "roles":[]
            },
            newUserVaildator: {},
            selectedUser: null
        }
    }, 
    async mounted() {
        this.getRoles();
        this.getUsers(false);
    },
    methods: {
        back() {
            if (this.mode == 1 || this.mode == 2)
                this.mode = 0;
            else
                this.mode--;
        },
        async getUsers(isNext) {
            if (this.progress.p0) return;
            if (isNext && !this.userFilter.next) return;
            else if (!isNext) {
                this.userFilter.next = true;
                this.userFilter.page = 0;
                this.users = [];
            }
            if (isNext) this.userFilter.page++;
            this.progress.p0 = true;
            var resp = await httpFunc("/auth/getUsers", this.userFilter, "auto");
            resp = resp.data;
            this.progress.p0 = false;
            if (resp.length == 0) {
                this.userFilter.next = false;
                return;
            }
            this.users = this.users.concat(resp);
        },
        async getRoles() {
            showProgress();
            var resp = await httpFunc("/auth/getRoles", this.userFilter, "auto");
            resp = resp.data;
            this.roles = resp;
            hideProgress();
        },
        iniNewUser(item) {
            if (item != null) {
                this.newUser["username"] = item["UserName"];
                this.newUser["email"] = item["Email"];
            } else {
                this.newUser["username"] = "";
                this.newUser["email"] = "";
            }
            this.roles.forEach(function (ritem) {
                ritem["selected"] = false;
            }.bind(this));
            this.mode = 1;
        },
        async createUser() {
            showProgress();
            this.newUser["roles"] = [];
            this.roles.forEach(function (ritem) {
                if (ritem["selected"])
                    this.newUser["roles"].push(ritem["NormalizedName"]);
            }.bind(this));
            var resp = await httpFunc("/auth/createUser", this.newUser, "auto");
            showSuccess(resp.data);
            hideProgress();
            this.mode = 0;
            this.getUsers(false);
        },
        iniEditUser(item) {
            this.newUser["username"] = item["UserName"];
            this.newUser["email"] = item["Email"];
            this.roles.forEach(function (ritem) {
                ritem["selected"] = item["Roles"].find(role => role == ritem["NormalizedName"] || role == ritem["Name"]) != null;
            }.bind(this));
            this.mode = 2;
        },
        async upadteUser() {
            showProgress();
            this.newUser["roles"] = [];
            this.roles.forEach(function (ritem) {
                if (ritem["selected"])
                    this.newUser["roles"].push(ritem["NormalizedName"]);
            }.bind(this));
            var resp = await httpFunc("/auth/updateUserRoles", this.newUser, "auto");
            showSuccess(resp.data);
            hideProgress();
            this.mode = 0;
            this.getUsers(false);
        },
        async deleteUser(item) {
            var confirm = await showConfirm("¿Desea eliminar el usuario <b>" + item["UserName"] + "</b>?");
            if (!confirm) return;
            showProgress();
            var resp = await httpFunc("/auth/deleteUser", { "username": item["UserName"] }, "auto");
            showSuccess(resp.data);
            hideProgress();
            this.mode = 0;
            this.getUsers(false);
        }
    }
}
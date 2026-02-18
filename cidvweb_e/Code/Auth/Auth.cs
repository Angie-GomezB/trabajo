using Azure;
using DocumentFormat.OpenXml.EMMA;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;
using experiann.Code.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json.Linq;
using System.Collections;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace orca.Code.Auth {
    public static class Auth {
        public static string AuthAppId { get; private set; } = orca.ConfigurationManager.AppSetting["AuthAppId"];
        public static async Task<string> ProcessRequest(HttpRequest request, HttpResponse response, string op, string body, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, RoleManager<ApplicationRole> roleManager) {
            response.ContentType = "application/json";
            string result = null;
            if (op == "getuserprofile")
                result = (await GetUserProfile(request, userManager)).ToString();
            else if (op == "createuser")
                result = (await CreateUser(JObject.Parse(body), userManager, roleManager)).ToString();
            else if (op == "createusers")
                result = (await CreateUsers(JArray.Parse(body), userManager, roleManager)).ToString();
            else if (op == "getusers")
                result = (await GetUsers(JObject.Parse(body), userManager)).ToString();
            else if (op == "deleteuser")
                result = (await DeleteUser(JObject.Parse(body), userManager)).ToString();
            else if (op == "createrole")
                result = (await CreateRole(JObject.Parse(body), roleManager)).ToString();
            else if (op == "getroles")
                result = (await GetRoles( roleManager)).ToString();
            else if (op == "deleterole")
                result = (await DeleteRole(JObject.Parse(body), roleManager)).ToString();
            else if (op == "updateuserroles")
                result = (await UpdateUserRoles(JObject.Parse(body), userManager, roleManager)).ToString();
            else if (op == "login")
                result = (await Login(JObject.Parse(body), signInManager)).ToString();
            else if (op == "logout")
                result = (await Logout(request, response, signInManager)).ToString();
            else if (op == "resetPassword")
                result = (await ResetPassword(JObject.Parse(body), userManager)).ToString();

            if (result == null) {
                response.StatusCode = 404;
                result = WebBDUt.NewBasicResponse(true, "op inválida").ToString();
            }
            return result;

        }
        public static async Task<JObject> GetUserProfile(HttpRequest request, UserManager<ApplicationUser> userManager) {
            JObject result = WebBDUt.NewBasicResponse(false, null);
            if (request.HttpContext.User?.Identity?.IsAuthenticated == true) {
                string username = userManager.NormalizeName(request.HttpContext.User.Identity.Name);
                JObject tmp = new JObject();
                tmp["user"] = username;
                ApplicationUser iuser = userManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
                IList<string> dbRoles = await userManager.GetRolesAsync(iuser);
                JArray jroles = [.. dbRoles];
                tmp["roles"] = jroles;
                //tmp["debug"] = true;
                result[WebBDUt.DATA] = tmp;
            }
            return result;
        }
        public static async Task<JObject> Login(JObject data, SignInManager<ApplicationUser> signInManager) {
            string username = signInManager.UserManager.NormalizeName(data["username"].Value<string>());
            ApplicationUser iuser = signInManager.UserManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
            if (iuser != null) {
                SignInResult sr = await signInManager.PasswordSignInAsync(iuser, data["password"].Value<string>(), true, false);
                if (sr.Succeeded)
                    return WebBDUt.NewBasicResponse(false, "OK");
                else
                    return WebBDUt.NewBasicResponse(true, "Datos incorrectos");
            }
            return WebBDUt.NewBasicResponse(true, "El usuario no existe");
        }
        public static async Task<JObject> Logout(HttpRequest request, HttpResponse response, SignInManager<ApplicationUser> signInManager) {
            var user = request.HttpContext.User;
            if (user == null || !user.Identity.IsAuthenticated) {
                response.StatusCode = 401;
                return WebBDUt.NewBasicResponse(true, "El usuario no está autenticado");
            }
            await signInManager.SignOutAsync();
            return WebBDUt.NewBasicResponse(false, "OK");
        }
        public static async Task<JObject> CreateUser(JObject data, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager) {
            string username = userManager.NormalizeName(data["username"].Value<string>());
            ApplicationUser iuser = userManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
            if (iuser == null) {
                iuser = new ApplicationUser();
                iuser.UserName = data["username"].Value<string>();
                iuser.ApplicationId = AuthAppId;
                if (data.ContainsKey("email") && data["email"].Value<string>() != "")
                    iuser.Email = data["email"].Value<string>();
                IdentityResult ir = await userManager.CreateAsync(iuser, data["password"].Value<string>());
                if (ir.Succeeded) {
                    if (data.ContainsKey("roles"))
                        await UpdateUserRoles(data, userManager, roleManager);
                    return WebBDUt.NewBasicResponse(false, "Usuario creado correctamente");
                }
                    
                else
                    return WebBDUt.NewBasicResponse(true, ir.Errors.First().Description);
            }
            return WebBDUt.NewBasicResponse(true, "El usuario ya existe");
        }
        public static async Task<JObject> CreateUsers(JArray data, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager) {
            JArray resp = new JArray();
            JObject tmp;
            foreach (JObject item in data) {
                tmp = await CreateUser(item, userManager, roleManager);
                resp.Add(tmp);
            }
            JObject ret = WebBDUt.NewBasicResponse(true, "");
            ret[WebBDUt.DATA] = resp;
            return ret;
        }
        public static async Task<JObject> UpdateUser(JObject data, UserManager<ApplicationUser> userManager){
            string username = userManager.NormalizeName(data["username"].Value<string>());
            ApplicationUser iuser = userManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
            if (iuser != null) {
                if (data.ContainsKey("email") && data["email"].Value<string>() != "")
                    iuser.Email = data["email"].Value<string>();
                IdentityResult ir = await userManager.UpdateAsync(iuser);
                if (ir.Succeeded)
                    return WebBDUt.NewBasicResponse(false, "OK");
                else
                    return WebBDUt.NewBasicResponse(true, ir.Errors.First().Description);
            }
            return WebBDUt.NewBasicResponse(true, "El usuario no existe");
        }
        public static async Task<JObject> DeleteUser(JObject data, UserManager<ApplicationUser> userManager) {
            string username = userManager.NormalizeName(data["username"].Value<string>());
            ApplicationUser iuser = userManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
            if (iuser != null) {
                IdentityResult ir = await userManager.DeleteAsync(iuser);
                if (ir.Succeeded)
                    return WebBDUt.NewBasicResponse(false, "El usuario se eliminó corretamente");
                else
                    return WebBDUt.NewBasicResponse(true, ir.Errors.First().Description);
            }
            return WebBDUt.NewBasicResponse(true, "El usuario no existe");
        }
        public static async Task<JObject> GetUsers(JObject data, UserManager<ApplicationUser> userManager) {
            string search = "";
            if(data.ContainsKey("username")) search = data["username"].Value<string>();
            int pageNumber = 0;
            if(data.ContainsKey("page")) pageNumber = data["page"].Value<int>();
            int pageSize = 5;
            var query = userManager.Users.AsQueryable();
            query = query.Where(u => u.UserName.Contains(search) && u.ApplicationId == AuthAppId /* || u.Email.Contains(search)*/);
            var users = await query
                .OrderBy(u => u.UserName)
                .Skip(pageNumber * pageSize)
                .Take(pageSize)
                .ToListAsync();
            JObject ret = WebBDUt.NewBasicResponse(false, "");
            JArray jusers = new JArray();
            foreach (var item in users) {
                jusers.Add(JObject.FromObject(new { item.Id, item.UserName, item.NormalizedUserName, item.Email, Roles = await userManager.GetRolesAsync(item)}));
            }
            ret[WebBDUt.DATA] = jusers;
            return ret;
        }
        public static async Task<JObject> CreateRole(JObject data, RoleManager<ApplicationRole> roleManager) {
            string roleName = data["role"].Value<string>().ToLower();
            string normalizedName = roleManager.NormalizeKey(roleName);
            ApplicationRole irole = roleManager.Roles.Where(role => role.NormalizedName == normalizedName && role.ApplicationId == AuthAppId).FirstOrDefault();
            if (irole == null) {
                irole = new ApplicationRole();
                irole.Name = roleName;
                irole.ApplicationId = AuthAppId;
                IdentityResult ir = await roleManager.CreateAsync(irole);
                if (ir.Succeeded)
                    return WebBDUt.NewBasicResponse(false, "OK");
                else
                    return WebBDUt.NewBasicResponse(true, ir.Errors.First().Description);
            }
            return WebBDUt.NewBasicResponse(true, "El rol ya existe");  
        }
        public static async Task<JObject> GetRoles(RoleManager<ApplicationRole> roleManager) {
            var roles = await roleManager.Roles.Where(role => role.ApplicationId == AuthAppId).ToListAsync();
            JObject ret = WebBDUt.NewBasicResponse(false, "");
            JArray jusers = new JArray();
            foreach (var item in roles) {
                jusers.Add(JObject.FromObject(new { item.Id, item.Name, item.NormalizedName}));
            }
            ret[WebBDUt.DATA] = jusers;
            return ret;
        }
        public static async Task<JObject> DeleteRole(JObject data, RoleManager<ApplicationRole> roleManager) {
            string roleName = data["role"].Value<string>().ToLower();
            ApplicationRole irole = roleManager.Roles.Where(role => role.Name == roleName && role.ApplicationId == AuthAppId).FirstOrDefault();
            if (irole != null) {
                IdentityResult ir = await roleManager.DeleteAsync(irole);
                if (ir.Succeeded)
                    return WebBDUt.NewBasicResponse(false, "OK");
                else
                    return WebBDUt.NewBasicResponse(true, ir.Errors.First().Description);
            }
            return WebBDUt.NewBasicResponse(true, "El rol no existe");
        }
        public static async Task<JObject> UpdateUserRoles(JObject data, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager) {
            string username = userManager.NormalizeName(data["username"].Value<string>());
            JArray jroles = (JArray)data["roles"];
            ApplicationUser iuser = userManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
            if (iuser != null) {
                var uroles = await userManager.GetRolesAsync(iuser);
                IdentityResult ir;
                if(uroles.Count > 0)
                    ir = await userManager.RemoveFromRolesAsync(iuser, uroles);
                ApplicationRole role;
                string nitem;
                JArray errors = new JArray();
                foreach (string item in jroles) {
                    nitem = roleManager.NormalizeKey(item);
                    role  = await roleManager.Roles.FirstOrDefaultAsync(r => r.NormalizedName == item && r.ApplicationId == AuthAppId);
                    if (role != null) {
                        ir = await userManager.AddToRoleAsync(iuser, role.Name);
                        if (!ir.Succeeded)
                            errors.Add(ir.Errors.First().Description);
                            return WebBDUt.NewBasicResponse(false, "El usuario se actualizó corretamente");
                    }
                    
                }
                return WebBDUt.NewBasicJResponse(errors.Count == 0, errors);
            }
            return WebBDUt.NewBasicResponse(true, "El usuario no existe");
        }

        public static async Task<JObject> ResetPassword(JObject data, UserManager<ApplicationUser> userManager) {
            string? username = data["username"]?.Value<string>();
            string? newPassword = data["newPassword"]?.Value<string>();
            ApplicationUser? iuser = userManager.Users.Where(user => user.UserName == username).FirstOrDefault();
            if (iuser != null && username != null && newPassword != null) {
                string token = await userManager.GeneratePasswordResetTokenAsync(iuser);
                IdentityResult ir = await userManager.ResetPasswordAsync(iuser, token, newPassword);
                if (ir.Succeeded)
                    return WebBDUt.NewBasicResponse(false, "OK");
                else
                    return WebBDUt.NewBasicResponse(true, ir.Errors.First().Description);
            }
            return WebBDUt.NewBasicResponse(true, "Datos incorrectos");
        }
        public static bool ValidateApiKey(string key) {
            bool isDev = WebBDUt.DefaultDBConnetionString.Contains("_Dev");
            if (isDev) {
                if (key != "Bearer l4e2wNsc7nWNvoPL2C1xzkxcZv1ks3LPJtG56Y61bSEv6h6XHWk66H6T2iCGmm43")
                    return false;
            } else {
                if (key != "Bearer PR4s5e1g7a6d4fGCh6hUscOJNfC94L73MCSXEs5R928OEIOcxJvogdxUEXhdOI3g")
                    return false;
            }
            return true;
        }

        private static AuthCache AuthCache = new AuthCache();
        public static async Task<bool> ValidateQueryAcces(HttpRequest request, string query, string rootPath, UserManager<ApplicationUser> userManager) {
            if (request.HttpContext.User?.Identity?.IsAuthenticated == true) 
                return await ValidateQueryAcces(request.HttpContext.User.Identity.Name, query, rootPath, userManager);
            return false;
        }
        public static async Task<bool> ValidateQueryAcces(string username, string query, string rootPath, UserManager<ApplicationUser> userManager) {
            username = userManager.NormalizeName(username);
            if (AuthCache.GetUserQueryCache(username, query))
                return true;

            ApplicationUser iuser = userManager.Users.Where(user => user.NormalizedUserName == username && user.ApplicationId == AuthAppId).FirstOrDefault();
            if (iuser == null) return false;

            IList<string> dbRoles = await userManager.GetRolesAsync(iuser);
            RoleList regexes = AuthCache.GetRolesCache(query, rootPath);
            if (regexes == null) return false;// Roles file doesnt exisits
            if (regexes.AllAccess) return true;

            for (int i = 0; i < dbRoles.Count; i++)
                for (int j = 0; j < regexes.Count; j++)
                    if (regexes[j].IsMatch(dbRoles[i])) {
                        AuthCache.AddUserQueryCache(username, query);
                        return true;
                    }

            return false;
        }

    }
}

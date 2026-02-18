using Newtonsoft.Json.Linq;
using System.Data;

namespace orca.Code.Api {
    public static class Generic {
        private static int Version = -1;
        public static JToken ProcessRequest(HttpRequest request, HttpResponse response, string op, string sp, string body, string rootPath) {
            if (Version == -1)
                Version = int.Parse(ConfigurationManager.AppSetting["Version"]);
            string ver = null;
            string fileName = null;
            if (ver != null && int.Parse(ver) < Version) {
                response.StatusCode = 205;
                return new JObject();
            }
            try {
                JObject data = null;
                if (body != "")
                    data = JObject.Parse(body);
                string? connectionString = null;
                if (data != null && data.ContainsKey("db")) {
                    string dbName = data["db"].Value<string>();
                    connectionString = WebBDUt.GetConnectionStringByName(dbName);
                } else { 
                    connectionString = WebBDUt.DefaultDBConnetionString;
                }
                if (data != null) {
                    var prop = data.Properties();
                    foreach (JProperty property in prop){
                        if (string.Equals(property.Name, "usuario", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(property.Name, "created_by", StringComparison.OrdinalIgnoreCase))
                            if (request.HttpContext.User?.Identity?.IsAuthenticated == true)
                                property.Value = request.HttpContext.User.Identity.Name;
                    }
                }

                if (op != null && (op.StartsWith("generic") || op == "exportData" || op == "exportDataSP" || op == "executeSP") && data != null) {
                    if (connectionString != null) {
                        if (op == "exportData") {
                            return WebBDUt.SetToFile(WebBDUt.ExecuteLocalSQL<DataSet>(sp, data, connectionString), sp.ToLower().Contains("txt"));
                        } else if (op == "exportDataSP") {
                            string fileType = "", delimiter = ",";
                            if (data.ContainsKey("fileType"))
                                fileType = data["fileType"].ToString();
                            if (data.ContainsKey("delimiter"))
                                delimiter = data["delimiter"].ToString();
                            if (fileType == "csv")
                                return WebBDUt.ExecuteSpToCSV(sp, data, delimiter, true, false, null, connectionString);
                            else
                                return WebBDUt.SetToFile(WebBDUt.ExecuteSP<DataSet>(sp, data, connectionString), sp.ToLower().Contains("txt"));

                        } else if (op == "executeSP") {
                            return WebBDUt.setToJObject(WebBDUt.ExecuteSP<DataSet>(sp, data, connectionString));
                        } else if (op.EndsWith("DS"))
                            return WebBDUt.ExecuteLocalSQLJson<DataSet>(sp, data, connectionString);
                        else if (op.EndsWith("DT"))
                            return WebBDUt.ExecuteLocalSQLJson<DataTable>(sp, data, connectionString);
                        else if (op.EndsWith("ST"))
                            return WebBDUt.ExecuteLocalSQLJson<string>(sp, data, connectionString);
                        else if (op.EndsWith("DO"))
                            return WebBDUt.ExecuteLocalSQLJson<object>(sp, data, connectionString);
                    } else {
                        JObject ret = new JObject();
                        ret[WebBDUt.ERRORMESSAGE] = "Error - no DB";
                        ret[WebBDUt.ISERROR] = true;
                        return ret;
                    }
                } else if (op == "uploadExecute") {
                    fileName = Path.Combine(rootPath, "Docs", data["fileName"].Value<string>());
                    bool isText = data["isText"].Value<bool>();
                    if (!isText)
                        WebBDUt.LoadTable(fileName, data["table"].Value<string>(), true, null, connectionString);
                    else
                        WebBDUt.LoadTableFromText(fileName, data["table"].Value<string>(), true, data["header"].Value<bool>(), data["separator"].Value<string>(), connectionString);
                    File.Delete(fileName);
                    return WebBDUt.SetToFile(WebBDUt.ExecuteSP<DataSet>(sp, data, connectionString), sp.ToLower().Contains("txt")).ToString(Newtonsoft.Json.Formatting.None);
                }/* else if (op == "getLoginData") {
                    JObject ret = new JObject();
                    ret["user"] = HttpContext.Current.User.Identity.Name;
                    ret["roles"] = string.Join(",", Roles.GetRolesForUser());
                    ret["debug"] = HttpContext.Current.IsDebuggingEnabled;
                    ret["version"] = Version;
                    if (data.ContainsKey("db"))
                        ret["devDB"] = connectionString.ToLower().Contains("_dev");
                    ret[WebBDUt.ISERROR] = false;
                    context.Response.Write(ret);
                } else if (op == "logout") {
                    FormsAuthentication.SignOut();
                    JObject ret = new JObject();
                    ret["result"] = "OK";
                    ret[WebBDUt.ISERROR] = false;
                    context.Response.Write(ret);
                } else if (op == "getProcedureParameters") {
                    context.Response.Write(WebBDUt.GetProcedureParameters(data["sp"].Value<string>(), connectionString));
                }*/ else {
                    JObject ret = new JObject();
                    ret[WebBDUt.ERRORMESSAGE] = "Error - La operación " + op + " es inváida";
                    ret[WebBDUt.ISERROR] = true;
                    return ret;
                }
            } catch (Exception ex) {
                JObject ret = new JObject();
                ret[WebBDUt.ERRORMESSAGE] = ex.Message;
                ret[WebBDUt.ISERROR] = true;
                orca.Code.Logger.Logger.Log("Generic-ProcessRequest " + ex.Message);
                orca.Code.Logger.Logger.Log(ex.StackTrace);
                if (fileName != null)
                    File.Delete(fileName);
                GC.Collect();
                return ret;
            }
            JObject ret2 = new JObject();
            ret2[WebBDUt.ERRORMESSAGE] = "Error - Unexpected end";
            ret2[WebBDUt.ISERROR] = true;
            return ret2;
        }
    }
}

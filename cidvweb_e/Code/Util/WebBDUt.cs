using Newtonsoft.Json.Linq;
using System.Data;

using System.Text;
using System.Text.RegularExpressions;

using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Runtime.CompilerServices;
using Microsoft.Data.SqlClient;
using orca.Code.Logger;
using System.Data.OleDb;
using System.IO.Compression;
using ExcelDataReader;
using MiniExcelLibs;

public static class WebBDUt {
    private static Dictionary<string, LocalSQLInfo> SQLCache = new Dictionary<string, LocalSQLInfo>();
    private static Dictionary<string, string> ConnectionCache = new Dictionary<string, string>();
    public const string DATA = "data", ISERROR = "isError", ERRORMESSAGE = "errorMessage", TYPE = "Type", PARAMETER = "Parameter";
    private static Regex ParRegex = null;
    private static Regex SplitRegex = null;
    private static string RootPath;
    //private static Regex ParRegex {
    //    get {
    //        if (parRegex == null) {
    //            Init();
    //        }
    //        return parRegex;
    //    }
    //    set {
    //        parRegex = value;
    //    }
    //}
    public static bool UseCache { get; private set; } = true;
    public static bool MeasureTimes = false;
    public static string DefaultDBConnetionString { get; private set; }
    public static void Init(string rootPath, bool useCache, string? defaultDBName = null) {
        RootPath = rootPath;
        ParRegex = new Regex(@"declare|(--|\/\*).*[\r\n]+|[\r\n\t]", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        SplitRegex = new Regex(@",[^0-9]", RegexOptions.Compiled);
        UseCache = useCache;
        if (defaultDBName != null)
            DefaultDBConnetionString = GetConnectionStringByName(defaultDBName);
        Logger.Log("WebBDUt(1033) init. UseCache:" + UseCache);
    }
    public static JObject ExecuteLocalSQLJson<T>(string path, string[] pars, object[] vals, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        JObject ret = new JObject();
        string type = null;
        if (typeof(T) == typeof(DataTable)) {
            type = "DT";
        } else if (typeof(T) == typeof(DataSet)) {
            type = "DS";
        } else if (typeof(T) == typeof(string)) {
            type = "ST";
        } else if (typeof(T) == typeof(object)) {
            type = "DO";
        }
        if (type == null) {
            ret[ISERROR] = true;
            ret[ERRORMESSAGE] = "Tipo inválido, solo se permite DataTable, DataSet, string o object";
            return ret;
        }
        ret[ISERROR] = false;
        try {
            if (type == "DS") {
                ret[DATA] = setToJObject(ExecuteLocalSQL<DataSet>(path, pars, vals, cnString));
            } else if (type == "DT") {
                ret[DATA] = tableToJObject(ExecuteLocalSQL<DataTable>(path, pars, vals, cnString));
            } else if (type == "ST") {
                ret[DATA] = ExecuteLocalSQL<string>(path, pars, vals, cnString);
            } else if (type == "DO") {
                ret[DATA] = tableToSimpleJObject(ExecuteLocalSQL<DataTable>(path, pars, vals, cnString));
            }
        } catch (Exception e) {
            ret[ISERROR] = true;
            ret[ERRORMESSAGE] = e.Message;
            string text = e.Message + Environment.NewLine;
            text += "SP: " + (path ?? "") + Environment.NewLine;
            text += "Pars: ";
            if(pars != null)
                for (int i = 0; i < pars.Length; i++)
                    text += (pars[i] ?? "null") + "|";
            text += Environment.NewLine;
            text += "Vals: ";
            if (vals != null)
                for (int i = 0; i < vals.Length; i++)
                text += (vals[i] == null ? "null" : vals[i].ToString()) + "|";
            Logger.Log(text);
        }
        return ret;
    }
    public static JObject ExecuteLocalSQLJson<T>(string path, JObject data, string? cnString = null) {
        string[] pars;
        object[] vals;
        ParseParameters(data, out pars, out vals);
        return ExecuteLocalSQLJson<T>(path, pars, vals, cnString);
    }
    public static T ExecuteLocalSQL<T>(string path, string[] pars, object[] vals, string? cnString) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        string type = null;
        object ret = null;
        if (typeof(T) == typeof(DataTable)) {
            type = "DT";
            ret = new DataTable();
        } else if (typeof(T) == typeof(DataSet)) {
            type = "DS";
            ret = new DataSet();
        } else if (typeof(T) == typeof(string)) {
            type = "ST";
            ret = null;
        }
        if (type != null) {
            using (SqlConnection conn = new SqlConnection(cnString)) {
                LocalSQLInfo sqlInfo = GetLocalSQL(path);
                using (SqlCommand cmd = new SqlCommand(sqlInfo.Text, conn)) {
                    cmd.CommandType = CommandType.Text;
                    cmd.CommandTimeout = 3600 * 2;
                    if (pars != null && vals != null) {
                        int len = Math.Min(pars.Length, vals.Length);
                        
                        if (!sqlInfo.HasTypes)
                            for (int i = 0; i < len; i++) cmd.Parameters.AddWithValue(pars[i], vals[i]);
                        else {
                            Tuple<SqlDbType, int, int> tuple;
                            SqlParameter param = null;
                            for (int i = 0; i < len; i++) {
                                if (sqlInfo.Types.TryGetValue(pars[i], out tuple)) {
                                    if (tuple.Item3 != 0)
                                        param = new SqlParameter() { ParameterName = pars[i], SqlDbType = tuple.Item1, Precision = (byte)tuple.Item2, Scale = (byte)tuple.Item3 };
                                    else if (tuple.Item2 != 0)
                                        param = new SqlParameter(pars[i], tuple.Item1, tuple.Item2);
                                    else
                                        param = new SqlParameter(pars[i], tuple.Item1);
                                    param.Value = vals[i];
                                    cmd.Parameters.Add(param);
                                } else
                                    cmd.Parameters.AddWithValue(pars[i], vals[i]);
                            }
                        }
                    }
                    conn.Open();
                    if (type == "DS") {
                        SqlDataAdapter da = new SqlDataAdapter(cmd);
                        da.Fill((DataSet)ret);
                    } else if (type == "DT") {
                        SqlDataAdapter da = new SqlDataAdapter(cmd);
                        da.Fill((DataTable)ret);
                    } else if (type == "ST") {
                        var result = cmd.ExecuteScalar();
                        ret = result?.ToString() ?? string.Empty;
                    }
                    conn.Close();
                    cmd.Dispose();
                    conn.Dispose();
                }
            }
        }
        return (T)Convert.ChangeType(ret, typeof(T));
    }
    public static T ExecuteLocalSQL<T>(string path, JObject data, string? cnString = null) {
        string[] pars;
        object[] vals;
        ParseParameters(data, out pars, out vals);
        return ExecuteLocalSQL<T>(path, pars, vals, cnString);
    }
    public static T ExecuteSP<T>(string procedure, string[] pars, object[] vals, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        string type = null;
        object ret = null;
        if (typeof(T) == typeof(DataTable)) {
            type = "DT";
            ret = new DataTable();
        } else if (typeof(T) == typeof(DataSet)) {
            type = "DS";
            ret = new DataSet();
        } else if (typeof(T) == typeof(string)) {
            type = "ST";
            ret = null;
        } else if (typeof(T) == typeof(List<string>)) {
            type = "SL";
            ret = null;
        }
        if (type != null) {
            using (SqlConnection conn = new SqlConnection(cnString)) {
                using (SqlCommand cmd = new SqlCommand(procedure, conn)) {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.CommandTimeout = 3600 * 2;
                    if (pars != null && vals != null) {
                        int len = Math.Min(pars.Length, vals.Length);
                        for (int i = 0; i < len; i++) cmd.Parameters.AddWithValue(pars[i], vals[i]);
                    }
                    conn.Open();
                    if (type == "DS") {
                        SqlDataAdapter da = new SqlDataAdapter(cmd);
                        da.Fill((DataSet)ret);
                    } else if (type == "DT") {
                        SqlDataAdapter da = new SqlDataAdapter(cmd);
                        da.Fill((DataTable)ret);
                    } else if (type == "ST") {
                        ret = cmd.ExecuteScalar().ToString();
                    }
                    conn.Close();
                    cmd.Dispose();
                    conn.Dispose();
                }
            }
        }
        return (T)Convert.ChangeType(ret, typeof(T));
    }
    public static T ExecuteSP<T>(string path, JObject data, string? cnString = null) {
        string[] pars;
        object[] vals;
        ParseParameters(data, out pars, out vals);
        return ExecuteSP<T>(path, pars, vals, cnString);
    }
    public static List<string> DataReaderToCSV(SqlDataReader sdr, string delimiter, bool headers, DataTable extractFirst, string root) {
        List<string> ret = new List<string>();
        int resultado = 0, bufferCount = 0;
        const int bufferSize = 10000;
        do {
            resultado++;
            string url = "Resultado_" + resultado + "_" + Guid.NewGuid().ToString() + ".csv";
            string fileUri = Path.Combine(root, "Docs", url);

            int columns = sdr.FieldCount;
            if (extractFirst != null && resultado == 1) {
                for (int i = 0; i < columns; i++) {
                    //if (extractFirst.Columns.Contains(sdr.GetName(i))) continue;
                    extractFirst.Columns.Add(sdr.GetName(i), typeof(string));
                }
                while (sdr.Read()) {
                    DataRow dr = extractFirst.NewRow();
                    for (int i = 0; i < columns; i++) {
                        dr[i] = sdr.GetValue(i);
                    }
                    extractFirst.Rows.Add(dr);
                }
            } else {
                using (StreamWriter sw = new StreamWriter(fileUri, false, Encoding.UTF8, 1024)) {
                    StringBuilder sb = new StringBuilder();
                    if (headers) {
                        for (int i = 0; i < columns; i++) {
                            if (i > 0)
                                sb.Append(delimiter);
                            sb.Append(sdr.GetName(i));
                        }
                        sw.WriteLine(sb.ToString());
                    }
                    sb.Clear();
                    while (sdr.Read()) {
                        if (bufferCount == bufferSize) {
                            sw.Write(sb.ToString());
                            sb.Clear();
                            bufferCount = 0;
                        }
                        for (int i = 0; i < columns; i++) {
                            if (i > 0)
                                sb.Append(delimiter);
                            sb.Append(sdr.GetValue(i));
                        }
                        sb.AppendLine("");
                        bufferCount++;
                    }
                    if (bufferCount > 0) {
                        sw.Write(sb.ToString());
                        sb.Clear();
                        bufferCount = 0;
                    }
                }
                ret.Add(fileUri);
            }
        } while (sdr.NextResult());
        return ret;

    }
    public static void WriteBigFileFromDatabase(string connectionString, string filePath) {
        using (var connection = new SqlConnection(connectionString)) {
            connection.Open();

            using (var command = new SqlCommand("SELECT Id, Name, SaleAmount FROM dbo.LargeSalesTable", connection))
            using (var reader = command.ExecuteReader()) {
                var columnNames = new List<string>();
                for (int i = 0; i < reader.FieldCount; i++) {
                    columnNames.Add(reader.GetName(i));
                }
                var dataStream = StreamData(reader);
                MiniExcel.SaveAs(
                    filePath,
                    dataStream,
                    true
                );
            } 
        } 
    }
    public static IEnumerable<object[]> StreamData(SqlDataReader reader) {
        if (reader.HasRows) {
            int fieldCount = reader.FieldCount;
            while (reader.Read()) {
                var rowValues = new object[fieldCount];
                reader.GetValues(rowValues);
                yield return rowValues;
            }
        }
    }
    public static JObject ExecuteSpToCSV(string procedure, string[] pars, object[] vals, string delimiter, bool headers,  bool ziped, DataTable extractFirst, string root, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        JObject ret = new JObject();
        JArray resultArray = new JArray();
        ret[ISERROR] = false;
        ret[DATA] = resultArray;
        List<string> resultFiles = new List<string>();
        using (SqlConnection conn = new SqlConnection(cnString)) {
            using (SqlCommand cmd = new SqlCommand(procedure, conn)) {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 3600 * 2;
                if (pars != null && vals != null) {
                    int len = Math.Min(pars.Length, vals.Length);
                    for (int i = 0; i < len; i++) cmd.Parameters.AddWithValue(pars[i], vals[i]);
                }
                conn.Open();
                SqlDataReader sdr = cmd.ExecuteReader();
                resultFiles = DataReaderToCSV(sdr, delimiter, headers, extractFirst, root);
                conn.Close();
                cmd.Dispose();
                conn.Dispose();
            }
        }
        if (ziped) {
            string zipUri = Path.Combine(root, "Docs", "Result_" + Guid.NewGuid().ToString() + ".zip");
            using (FileStream zipToOpen = new FileStream(@"c:\users\exampleuser\release.zip", FileMode.Open)) {
                using (ZipArchive zip = new ZipArchive(zipToOpen, ZipArchiveMode.Create)) {
                    foreach (string file in resultFiles)
                        zip.CreateEntryFromFile(file, Path.GetFileName(file));
                }
            }
            foreach (string file in resultFiles) File.Delete(file);
            resultArray.Add(zipUri);
            ret[DATA] = Path.GetFileName(zipUri);
        } else {
            foreach (string file in resultFiles)
                resultArray.Add(file);
        }
        return ret;
    }
    public static JObject ExecuteSpToCSV(string procedure, JObject data, string delimiter, bool headers, bool ziped, DataTable extractFirst, string root, string? cnString = null) {
        string[] pars;
        object[] vals;
        ParseParameters(data, out pars, out vals);
        return ExecuteSpToCSV(procedure, data, delimiter, headers, ziped, extractFirst, root, cnString);
    }
    public static JObject ExecuteQueryToCSV(string path, string[] pars, object[] vals, string delimiter, bool headers, bool ziped, DataTable? extractFirst, string root, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        JObject ret = new JObject();
        JArray resultArray = new JArray();
        ret[ISERROR] = false;
        ret[DATA] = resultArray;
        List<string> resultFiles = new List<string>();
        using (SqlConnection conn = new SqlConnection(cnString)) {
            LocalSQLInfo sqlInfo = GetLocalSQL(path);
            using (SqlCommand cmd = new SqlCommand(sqlInfo.Text, conn)) {
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 3600 * 2;
                if (pars != null && vals != null) {
                    int len = Math.Min(pars.Length, vals.Length);
                    if (!sqlInfo.HasTypes)
                        for (int i = 0; i < len; i++) cmd.Parameters.AddWithValue(pars[i], vals[i]);
                    else {
                        Tuple<SqlDbType, int, int> tuple;
                        SqlParameter param = null;
                        for (int i = 0; i < len; i++) {
                            if (sqlInfo.Types.TryGetValue(pars[i], out tuple)) {
                                if (tuple.Item3 != 0)
                                    param = new SqlParameter() { ParameterName = pars[i], SqlDbType = tuple.Item1, Precision = (byte)tuple.Item2, Scale = (byte)tuple.Item3 };
                                else if (tuple.Item2 != 0)
                                    param = new SqlParameter(pars[i], tuple.Item1, tuple.Item2);
                                else
                                    param = new SqlParameter(pars[i], tuple.Item1);
                                param.Value = vals[i];
                                cmd.Parameters.Add(param);
                            } else
                                cmd.Parameters.AddWithValue(pars[i], vals[i]);
                        }
                    }
                }
                conn.Open();
                SqlDataReader sdr = cmd.ExecuteReader();
                resultFiles = DataReaderToCSV(sdr, delimiter, headers, extractFirst, root);
                conn.Close();
                cmd.Dispose();
                conn.Dispose();
            }
        }
        if (ziped) {
            string zipUri = Path.Combine(root, "Docs", "Result_" + Guid.NewGuid().ToString() + ".zip");
            using (FileStream zipToOpen = new FileStream(@"c:\users\exampleuser\release.zip", FileMode.Open)) {
                using (ZipArchive zip = new ZipArchive(zipToOpen, ZipArchiveMode.Create)) {
                    foreach (string file in resultFiles)
                        zip.CreateEntryFromFile(file, Path.GetFileName(file));
                }
            }
            foreach (string file in resultFiles) File.Delete(file);
            resultArray.Add(zipUri);
            ret[DATA] = Path.GetFileName(zipUri);
        } else {
            foreach (string file in resultFiles)
                resultArray.Add(file);
        }
        return ret;
    }
    public static JObject ExecuteQueryToExcel(string path, string[] pars, object[] vals, string root, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        JObject ret = new JObject();
        JArray resultArray = new JArray();
        ret[ISERROR] = false;
        List<string> resultFiles = new List<string>();
        using (SqlConnection conn = new SqlConnection(cnString)) {
            LocalSQLInfo sqlInfo = GetLocalSQL(path);
            using (SqlCommand cmd = new SqlCommand(sqlInfo.Text, conn)) {
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 3600 * 2;
                if (pars != null && vals != null) {
                    int len = Math.Min(pars.Length, vals.Length);
                    if (!sqlInfo.HasTypes)
                        for (int i = 0; i < len; i++) cmd.Parameters.AddWithValue(pars[i], vals[i]);
                    else {
                        Tuple<SqlDbType, int, int> tuple;
                        SqlParameter param = null;
                        for (int i = 0; i < len; i++) {
                            if (sqlInfo.Types.TryGetValue(pars[i], out tuple)) {
                                if (tuple.Item3 != 0)
                                    param = new SqlParameter() { ParameterName = pars[i], SqlDbType = tuple.Item1, Precision = (byte)tuple.Item2, Scale = (byte)tuple.Item3 };
                                else if (tuple.Item2 != 0)
                                    param = new SqlParameter(pars[i], tuple.Item1, tuple.Item2);
                                else
                                    param = new SqlParameter(pars[i], tuple.Item1);
                                param.Value = vals[i];
                                cmd.Parameters.Add(param);
                            } else
                                cmd.Parameters.AddWithValue(pars[i], vals[i]);
                        }
                    }
                }
                conn.Open();
                SqlDataReader sdr = cmd.ExecuteReader();

                string url = "Resultado_" + Guid.NewGuid().ToString() + ".xlsx";
                string fileUri = Path.Combine(root, "Docs", url);
                int resultado = 0;
                do {
                    resultado++;
                    if (resultado == 1)
                        MiniExcel.SaveAs(fileUri, sdr, true, "Hoja" + resultado);
                    else
                        MiniExcel.Insert(fileUri, sdr, "Hoja" + resultado, ExcelType.XLSX, null, true);
                } while (sdr.NextResult());
                ret[DATA] = url;
                conn.Close();
                cmd.Dispose();
                conn.Dispose();
            }
        }
        return ret;
    }
    public static JObject ExecuteSpToExcel(string procedure, string[] pars, object[] vals, string root, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        JObject ret = new JObject();
        JArray resultArray = new JArray();
        ret[ISERROR] = false;
        List<string> resultFiles = new List<string>();
        using (SqlConnection conn = new SqlConnection(cnString)) {
            
            using (SqlCommand cmd = new SqlCommand(procedure, conn)) {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 3600 * 2;
                if (pars != null && vals != null) {
                    int len = Math.Min(pars.Length, vals.Length);
                    for (int i = 0; i < len; i++) cmd.Parameters.AddWithValue(pars[i], vals[i]);
                }
                conn.Open();
                SqlDataReader sdr = cmd.ExecuteReader();

                string url = "Resultado_" + Guid.NewGuid().ToString() + ".xlsx";
                string fileUri = Path.Combine(root, "Docs", url);
                int resultado = 0;
                do {
                    resultado++;
                    if (resultado == 1)
                        MiniExcel.SaveAs(fileUri, sdr, true, "Hoja" + resultado);
                    else
                        MiniExcel.Insert(fileUri, sdr, "Hoja" + resultado, ExcelType.XLSX, null, true);
                } while (sdr.NextResult());
                ret[DATA] = url;
                conn.Close();
                cmd.Dispose();
                conn.Dispose();
            }
        }
        return ret;
    }
    public static bool LoadTable(DataTable dt, string tableName, bool deleteTable, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        if (deleteTable)
            using (SqlConnection Connection = new SqlConnection(cnString)) {
                SqlCommand Command = new SqlCommand("delete from " + tableName, Connection);
                Command.CommandType = CommandType.Text;
                Connection.Open();
                Command.ExecuteNonQuery();
                Connection.Close();
                Connection.Dispose();
            }
        using (SqlBulkCopy bulkCopy = new SqlBulkCopy(cnString)) {
            bulkCopy.BulkCopyTimeout = 2 * 3600;
            bulkCopy.DestinationTableName = tableName;
            bulkCopy.WriteToServer(dt);
            bulkCopy.Close();
        }
        return true;
    }
    public static bool LoadTable(string fileName, string tableName, bool deleteTable, string? sheetName, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        if (sheetName == null)
            sheetName = "Hoja1";
        LoadTable(fileName, tableName, "Hoja1", deleteTable, cnString);
        return true;
    }
    public static bool LoadTable(string fileName, string tableName, string sheetName, bool deleteTable, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        if (deleteTable)
            using (SqlConnection Connection = new SqlConnection(cnString)) {
                SqlCommand Command = new SqlCommand("delete from " + tableName, Connection);
                Command.CommandType = CommandType.Text;
                Connection.Open();
                Command.ExecuteNonQuery();
                Connection.Close();
                Connection.Dispose();
            }
        string connectionString = "Provider=Microsoft.ACE.OLEDB.12.0; Data Source=" + fileName + "; Extended Properties='Excel 12.0;HDR=YES;IMEX=1;TypeGuessRows=500;';";
        string commandText = "select * from [" + sheetName + "$]";
        using (OleDbConnection myConnection = new OleDbConnection(connectionString)) {
            using (OleDbCommand myCommand = new OleDbCommand(commandText, myConnection)) {
                myCommand.CommandTimeout = 50000;
                myConnection.Open();
                OleDbDataReader dr = myCommand.ExecuteReader();
                using (SqlBulkCopy bulkCopy = new SqlBulkCopy(cnString)) {
                    bulkCopy.BulkCopyTimeout = 2 * 3600;
                    bulkCopy.DestinationTableName = tableName;
                    bulkCopy.WriteToServer(dr);
                    bulkCopy.Close();
                }
                myCommand.Dispose();
                myConnection.Close();
                myConnection.Dispose();
            }
        }
        return true;
    }
    public static bool LoadTableFromText(string fileName, string tableName, bool deleteTable, bool header, string separator,string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        if (deleteTable)
            using (SqlConnection Connection = new SqlConnection(cnString)) {
                SqlCommand Command = new SqlCommand("delete from " + tableName, Connection);
                Command.CommandType = CommandType.Text;
                Connection.Open();
                Command.ExecuteNonQuery();
                Connection.Close();
                Connection.Dispose();
            }
        DataTable dt = new DataTable();
        using (SqlConnection Connection = new SqlConnection(cnString)) {
            SqlCommand Command = new SqlCommand("select top 0 * from [" + tableName+"]", Connection);
            Command.CommandType = CommandType.Text;
            Connection.Open();
            SqlDataAdapter da = new SqlDataAdapter(Command);
            da.Fill(dt);
            Connection.Close();
            Connection.Dispose();
        }
        int colSize = dt.Columns.Count;

        char sep = '\n';
        if (separator != null && separator.Length == 1) sep = separator[0];

        /*Read csv file */
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = sep.ToString(),
            BadDataFound = null,
            MissingFieldFound = null,
            HasHeaderRecord = header
        };
        using (var reader = new StreamReader(fileName))
        using (var csv = new CsvReader(reader, config)){
            bool endOfFile = false;
            if (header){
                csv.Read(); // Omitir headers
            }
            while (!endOfFile) {
                endOfFile = !csv.Read();// csv.Read() avanza una línea y devuelve true si no es el fin del documento
                if (!endOfFile){
                    var row = dt.NewRow();
                    if (sep == '\n')
                        row["Value"] = csv.GetField(0);
                    else {
                        for (int i = 0; i < dt.Columns.Count; i++) {
                            row[i] = (object)csv.GetField(i)?? DBNull.Value;
                        }
                    }
                    dt.Rows.Add(row);
                }

                if (dt.Rows.Count >= 50000 || endOfFile) {
                    using (SqlBulkCopy bulkCopy = new SqlBulkCopy(cnString)){
                        bulkCopy.BulkCopyTimeout = 2 * 3600;
                        bulkCopy.DestinationTableName = tableName;
                        bulkCopy.WriteToServer(dt);
                        bulkCopy.Close();
                    }
                    dt.Rows.Clear();
                }
            }
        }
        return true;
    }
    public static bool LoadTableFromExcel(string fileName, string tableName, bool deleteTable, string? cnString = null) {
        if (cnString == null)
            cnString = DefaultDBConnetionString;
        if (deleteTable)
            using (SqlConnection Connection = new SqlConnection(cnString)) {
                SqlCommand Command = new SqlCommand("delete from " + tableName, Connection);
                Command.CommandType = CommandType.Text;
                Connection.Open();
                Command.ExecuteNonQuery();
                Connection.Close();
                Connection.Dispose();
            }
        DataTable dt = new DataTable();
        using (SqlConnection Connection = new SqlConnection(cnString)) {
            SqlCommand Command = new SqlCommand("select top 0 * from [" + tableName + "]", Connection);
            Command.CommandType = CommandType.Text;
            Connection.Open();
            SqlDataAdapter da = new SqlDataAdapter(Command);
            da.Fill(dt);
            Connection.Close();
            Connection.Dispose();
        }
        bool endOfFile = false;
        DataRow dr;
        object[] odata = new object[dt.Columns.Count];
        using (FileStream stream = File.Open(fileName, FileMode.Open, FileAccess.Read)) {
            using (IExcelDataReader reader = ExcelReaderFactory.CreateReader(stream)) {
                endOfFile = !reader.Read();
                while (!endOfFile) {
                    endOfFile = !reader.Read();
                    if (!endOfFile) {
                        //dr = dt.NewRow();
                        reader.GetValues(odata);
                        /*for (int i = 0; i < dt.Columns.Count; i++) {
                            dr[i] = (object)(reader.GetValue(0)?.ToString()) ?? DBNull.Value;
                        }*/
                        dt.Rows.Add(odata);
                    }

                    if (dt.Rows.Count >= 50000 || endOfFile) {
                        using (SqlBulkCopy bulkCopy = new SqlBulkCopy(cnString)) {
                            bulkCopy.BulkCopyTimeout = 2 * 3600;
                            bulkCopy.DestinationTableName = tableName;
                            bulkCopy.WriteToServer(dt);
                            bulkCopy.Close();
                        }
                        dt.Rows.Clear();
                    }
                }
            }
        }
        return true;
    }
    [MethodImpl(MethodImplOptions.Synchronized)]
    private static LocalSQLInfo GetLocalSQL(string path) {
        LocalSQLInfo info = null;
        if (!SQLCache.ContainsKey(path)) {
            string filePath = Path.Combine(RootPath , "SQL", path + ".sql");
            string[] roles = File.ReadAllText(System.IO.Path.GetDirectoryName(filePath)+ "/roles.csv").Replace("\r", "").Replace("\n", "").Split(',');
            info = new LocalSQLInfo();
            //info.Roles = new Regex[roles.Length];
            //for (int i = 0; i < roles.Length; i++)
            //    info.Roles[i] = new Regex("^" + Regex.Escape(roles[i]).Replace("\\*", ".*") + "$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
            info.Text = File.ReadAllText(filePath);
            int index0 = info.Text.IndexOf("--START_PARAM");
            int index1 = info.Text.IndexOf("--END_PARAM");
            if ((index0 >= 0 && index1 < 0) || (index0 < 0 && index1 >= 0))
                throw new Exception("Seccion START_PARAM - END_PARAM inválida " + path);
            if(index0 >= 0 && index1 >= 0) {
                try {
                    string parameters = info.Text.Substring(index0 + 13, index1 - index0 - 13);
                    index1 += 11;
                    if (index0 == 0)
                        info.Text = info.Text.Substring(index1);
                    else
                        info.Text = info.Text.Substring(0, index0) + " " + info.Text.Substring(index1);

                    parameters = ParRegex.Replace(parameters, ""); //parameters.Replace("declare", "").Replace("\r", "").Replace("\n", "").Replace("\t", " ").Replace("@", "");
                    string[] parArray = SplitRegex.Split(parameters); //parameters.Split(',');
                    info.HasTypes = parArray.Length > 0;
                    string parName, dataType;
                    SqlDbType type;
                    string length, precision;
                    if (info.HasTypes)
                        info.Types = new Dictionary<string, Tuple<SqlDbType, int, int>>();
                    for (int i = 0; i < parArray.Length; i++) {
                        parArray[i] = parArray[i].Replace('@', ' ').Trim();
                        index0 = parArray[i].IndexOf(' ');
                        if (index0 < 0) continue;
                        parName = parArray[i].Substring(0, index0);
                        dataType = parArray[i].Substring(index0).Replace(" ", "").ToLower();
                        length = "0";
                        precision = "0";
                        index0 = dataType.IndexOf("(");
                        index1 = dataType.IndexOf(")");
                        if (index0 >= 0 && index1 > index0) {
                            length = dataType.Substring(index0 + 1, index1 - index0 - 1);
                            if (length == "max")
                                length = "-1";
                            else if ((index1 = length.IndexOf(",")) > 0) {
                                precision = length.Substring(index1 + 1);
                                length = length.Substring(0, index1);
                            }
                            dataType = dataType.Substring(0, index0);
                        } else {
                            index0 = dataType.IndexOf("=");
                            if (index0 < 0) index0 = dataType.IndexOf("-");
                            if (index0 < 0) index0 = dataType.IndexOf("/");
                            if (index0 >= 0)
                                dataType = dataType.Substring(0, index0);
                        }
                        type = SqlDbType.Variant;

                        if (dataType == "bigint") type = SqlDbType.BigInt;
                        else if (dataType == "binary") type = SqlDbType.Binary;
                        else if (dataType == "bit") type = SqlDbType.Bit;
                        else if (dataType == "char") type = SqlDbType.Char;
                        else if (dataType == "datetime") type = SqlDbType.DateTime;
                        else if (dataType == "decimal") type = SqlDbType.Decimal;
                        else if (dataType == "numeric") type = SqlDbType.Decimal;
                        else if (dataType == "float") type = SqlDbType.Float;
                        else if (dataType == "image") type = SqlDbType.Image;
                        else if (dataType == "int") type = SqlDbType.Int;
                        else if (dataType == "money") type = SqlDbType.Money;
                        else if (dataType == "nchar") type = SqlDbType.NChar;
                        else if (dataType == "ntext") type = SqlDbType.NText;
                        else if (dataType == "nvarchar") type = SqlDbType.NVarChar;
                        else if (dataType == "real") type = SqlDbType.Real;
                        else if (dataType == "uniqueidentifier") type = SqlDbType.UniqueIdentifier;
                        else if (dataType == "smalldatetime") type = SqlDbType.SmallDateTime;
                        else if (dataType == "smallint") type = SqlDbType.SmallInt;
                        else if (dataType == "smallmoney") type = SqlDbType.SmallMoney;
                        else if (dataType == "text") type = SqlDbType.Text;
                        else if (dataType == "timestamp") type = SqlDbType.Timestamp;
                        else if (dataType == "tinyint") type = SqlDbType.TinyInt;
                        else if (dataType == "varbinary") type = SqlDbType.VarBinary;
                        else if (dataType == "varchar") type = SqlDbType.VarChar;
                        else if (dataType == "variant") type = SqlDbType.Variant;
                        else if (dataType == "xml") type = SqlDbType.Xml;
                        else if (dataType == "udt") type = SqlDbType.Udt;
                        else if (dataType == "structured") type = SqlDbType.Structured;
                        else if (dataType == "date") type = SqlDbType.Date;
                        else if (dataType == "time") type = SqlDbType.Time;
                        else if (dataType == "datetime2") type = SqlDbType.DateTime2;

                        info.Types.Add("@"+parName, new Tuple<SqlDbType, int, int>(type, int.Parse(length), int.Parse(precision)));
                    }
                } catch (Exception e) {
                    throw new Exception("Error procesando parámetros en "+path, e.InnerException);
                }
            }
            info.Path = path;
            if(UseCache)
                SQLCache.Add(path, info);
        } else
            info = SQLCache[path];

        return info;
    }
    public static JArray setToJObject(System.Data.DataSet ds) {
        System.Data.DataTable dt;
        JArray ret = new JArray(), mid;
        JObject obj;
        JValue token;
        for (int k = 0; k < ds.Tables.Count; k++) {
            mid = new JArray();
            dt = ds.Tables[k];
            for (int i = 0; i < dt.Rows.Count; i++) {
                obj = new JObject();
                for (int j = 0; j < dt.Columns.Count; j++) {
                    token = new JValue(dt.Rows[i][j].ToString());
                    obj.Add(dt.Columns[j].ColumnName, token);
                }
                mid.Add(obj);
            }
            ret.Add(mid);
        }
        return ret;
    }
    public static JArray tableToJObject(System.Data.DataTable dt) {
        JArray ret = new JArray();
        JObject obj;
        JValue token;
        for (int i = 0; i < dt.Rows.Count; i++) {
            obj = new JObject();
            for (int j = 0; j < dt.Columns.Count; j++) {
                token = new JValue(dt.Rows[i][j].ToString());
                obj.Add(dt.Columns[j].ColumnName, token);
            }
            ret.Add(obj);
        }
        return ret;
    }
    public static JObject tableToSimpleJObject(System.Data.DataTable dt) {
        JObject obj = new JObject(); ;
        JValue token;
        for (int i = 0; i < dt.Rows.Count; i++) {
            for (int j = 0; j < dt.Columns.Count; j++) {
                token = new JValue(dt.Rows[i][j].ToString());
                obj.Add(dt.Columns[j].ColumnName, token);
            }
            break;
        }
        return obj;
    }
    public static JObject GetProcedureParameters(string procedure, string str_conn) {
        JObject ret = new JObject();
        ret[ISERROR] = false;
        DataTable dataTable = new DataTable();
        dataTable.Columns.Add(PARAMETER);
        dataTable.Columns.Add(TYPE);
        using (SqlConnection conn = new SqlConnection(str_conn)) {
            using (SqlCommand cmd = new SqlCommand(procedure, conn)) {
                cmd.CommandType = CommandType.StoredProcedure;
                conn.Open();
                SqlCommandBuilder.DeriveParameters(cmd);
                foreach (SqlParameter p in cmd.Parameters)
                    dataTable.Rows.Add(p.ParameterName, p.SqlDbType.ToString());
            }
        }
        ret[DATA] = tableToJObject(dataTable);
        return ret;
    }
    public static JObject GetQueryParameters(string query) {
        query = query.Replace("-", "/");
        JObject ret = new JObject();
        ret[ISERROR] = false;
        LocalSQLInfo info = GetLocalSQL(query);
        JArray data = new JArray();
        JObject tmp = new JObject();
        foreach (var item in info.Types) {
            tmp = new JObject();
            tmp[PARAMETER] = item.Key;
            tmp[TYPE] = item.Value.Item1.ToString();
            data.Add(tmp);
        }
        ret[DATA] = data;
        return ret;
    }

    public static JObject SetToFile(DataSet ds, bool isTxt) {
        JObject ret = new JObject();
        string message = null;
        string retUrl = null;
        bool isError = false;
        if (ds.Tables.Count == 0) {
            message = "Error - Sin resultados";
            isError = true;
        } else if (ds.Tables.Count == 1 && ds.Tables[0].Rows.Count == 0) {
            message = "Error - Resultados vacios";
            isError = true;
        } else if (ds.Tables.Count == 1 && ds.Tables[0].Rows.Count == 1 && ds.Tables[0].Columns.Count == 1)
            message = ds.Tables[0].Rows[0][0].ToString();
        else if (isTxt) {
            string url = Guid.NewGuid().ToString() + ".txt";
            string fileUri = Path.Combine(RootPath, "Docs", url);
            using (StreamWriter file = new StreamWriter(fileUri,false,Encoding.UTF8)) {
                DataTable dt = ds.Tables[0];
                String Data = ToCsv(dt);
                file.Write(Data);
            }
            retUrl = url;
        } else {
            ClosedXML.Excel.XLWorkbook wp = new ClosedXML.Excel.XLWorkbook();
            DataTable dt;
            for (int i = 0; i < ds.Tables.Count; i++) {
                dt = ds.Tables[i];
                dt.TableName = "Hoja" + (i + 1);
                wp.AddWorksheet(dt);
            }
            string url = Guid.NewGuid().ToString() + ".xlsx";
            wp.SaveAs(Path.Combine(RootPath, "Docs", url));
            retUrl = url;
        }
        ret[DATA] = retUrl;
        ret[ERRORMESSAGE] = message;
        ret[ISERROR] = isError;
        return ret;
    }

    public static string ToCsv(DataTable dataTable)
    {
        StringBuilder sbData = new StringBuilder();

        // Only return Null if there is no structure.
        if (dataTable.Columns.Count == 0)
            return null;

        foreach (var col in dataTable.Columns)
        {
            if (col == null)
                sbData.Append(",");
            else
                sbData.Append(col.ToString().Replace("\"", "\"\"") + ",");
        }

        sbData.Replace(",", System.Environment.NewLine, sbData.Length - 1, 1);

        foreach (DataRow dr in dataTable.Rows)
        {
            foreach (var column in dr.ItemArray)
            {
                if (column == null)
                    sbData.Append(",");
                else
                    sbData.Append(column.ToString().Replace("\"", "\"\"") +",");
            }
            sbData.Replace(",", System.Environment.NewLine, sbData.Length - 1, 1);
        }

        return sbData.ToString();
    }
    public static string GetConnectionStringByName(string name) {
        if (!ConnectionCache.ContainsKey(name)) {
            ConnectionCache.Add(name, orca.ConfigurationManager.AppSetting["ConnectionStrings:" + name]);
        }
        return ConnectionCache[name];
    }
    public static void ParseParameters(JArray jpars, out string[] pars, out object[] vals, string username = null, string roles = null) {
        string par, lcapr, val;
        pars = new string[jpars.Count];
        vals = new object[jpars.Count];
        for (int i = 0; i < jpars.Count; i++) {
            par = jpars[i]["name"].Value<string>();
            val = jpars[i]["value"].Value<string>();
            lcapr = par.ToLower();
            if (username != null && (lcapr == "usuario" || lcapr == "created_by" || lcapr == "updated_by"))
                val = username;
            else if (roles != null && (lcapr == "roles"))
                val = roles;
            pars[i] = "@" + par;
            vals[i] = val;
        }
    }
    public static void ParseParameters(JObject data, out string[] pars, out object[] vals, string username = null, string roles = null) {
        var prop = data.Properties();
        int len = prop.Count();
        string par, val, lcapr;
        pars = new string[len];
        vals = new object[len];
        len = 0;
        foreach (JProperty property in prop) {
            par = property.Name;
            val = property.Value.ToString();
            lcapr = par.ToLower();
            if (username != null && (lcapr == "usuario" || lcapr == "created_by" || lcapr == "updated_by"))
                val = username;
            else if (roles != null && (lcapr == "roles"))
                val = roles;
            pars[len] = "@" + par;
            vals[len] = val;
            len++;
        }
    }
    public static JObject NewBasicResponse(bool isError, string? data) {
        JObject ret = new JObject();
        ret[ISERROR] = isError;
        if(isError)
            ret[ERRORMESSAGE] = data;
        else
            ret[DATA] = data;
        return ret;
    }
    public static JObject NewBasicJResponse(bool isError, JContainer? data) {
        JObject ret = new JObject();
        ret[ISERROR] = isError;
        if (isError)
            ret[ERRORMESSAGE] = data;
        else
            ret[DATA] = data;
        return ret;
    }
    private class LocalSQLInfo {
        public string Path;
        public string Text;
        public Dictionary<string, Tuple<SqlDbType, int, int>> Types;
        public bool HasTypes;
        public DateTime Date = DateTime.Now;    }
}
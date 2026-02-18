using orca.Code.Api;
using orca.Code.Auth;
using orca.Code.Logger;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Newtonsoft.Json.Linq;
using Microsoft.Data.SqlClient;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AuthDBContext>();
builder.Services.AddAuthorization();
builder.Services.AddCors(); // CORS

var identityBuilder = builder.Services.AddIdentity<ApplicationUser, ApplicationRole>()
    .AddUserManager<ApplicationUserManager>()
    .AddEntityFrameworkStores<AuthDBContext>();
identityBuilder.Services.RemoveAll<IUserValidator<ApplicationUser>>();
identityBuilder.AddUserValidator<ApplicationUserValidator>();
//identityBuilder.Services.RemoveAll<IUserValidator<ApplicationUser>>();
//identityBuilder.AddUserValidator<ApplicationUserValidator>();
//identityBuilder.Services.RemoveAll<IRoleValidator<ApplicationRole>>();
//identityBuilder.AddRoleValidator<ApplicationRoleValidator>();
builder.Services.ConfigureApplicationCookie(options => {
    options.ExpireTimeSpan = TimeSpan.FromHours(4);
    options.SlidingExpiration = true;
    options.LoginPath = "/login.html";
});
var app = builder.Build();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()){
    app.MapOpenApi();
}
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions() {
    OnPrepareResponse = (context) => {
        string fileName = context.File.Name.ToLower();
        string filePath = (context.File.PhysicalPath ?? "").ToLower();
        if (filePath.Contains("/web/") || filePath.Contains("\\web\\")){
            context.Context.Response.Headers["Cache-Control"] = "no-cache, no-store";
            context.Context.Response.Headers["Pragma"] = "no-cache";
            context.Context.Response.Headers["Expires"] = "-1";
        }
        if (filePath.Contains("/css/") || filePath.Contains("/js/") || filePath.Contains("/img/") ||
            filePath.Contains("\\css\\") || filePath.Contains("\\js\\") || filePath.Contains("\\img\\") ||
            fileName == "login.html" || fileName == "login.js" || filePath.Contains("/l/") || filePath.Contains("\\l\\"))
            return;
        if (fileName != "login.html" && !(context.Context.User?.Identity?.IsAuthenticated ?? false)){
            context.Context.Response.Clear();
            context.Context.Response.Body = new MemoryStream();
            context.Context.Response.StatusCode = 302;
            context.Context.Response.Headers.Location = "./login.html";
        }
    }
});

/*****************************************************************************/
/***************************** Constantes ************************************/
/*****************************************************************************/
string rootPath = builder.Environment.ContentRootPath;
Logger.Init(rootPath);
Logger.Log("INIT");
WebBDUt.Init(rootPath, !app.Environment.IsDevelopment(), orca.ConfigurationManager.AppSetting["DefaultDB"]);
/*****************************************************************************/
/***************************** Servicios *************************************/
/*****************************************************************************/

app.Map("/generic/{op}/{sp}", async (HttpRequest request, HttpResponse response, string op, string sp, UserManager<ApplicationUser> userManager) => {
    string body = "";
    try {
        sp = sp.Replace('-', '/');
        response.ContentType = "application/json";
        if (!sp.StartsWith("Landing/") && !await Auth.ValidateQueryAcces(request, sp, rootPath, userManager)) {
            response.StatusCode = 401;
            return WebBDUt.NewBasicResponse(true, "No access to " + sp + " in roles file").ToString();
        }
        using (var stream = new StreamReader(request.Body)) {
            body = await stream.ReadToEndAsync();
        }
        return Generic.ProcessRequest(request, response, op, sp, body, rootPath).ToString(Newtonsoft.Json.Formatting.None);
    } catch (Exception ex) {
        Logger.Log("generic/" + op + "    " + ex.Message + Environment.NewLine + body + Environment.NewLine + ex.StackTrace);
        response.StatusCode = 500;
        return ex.Message + Environment.NewLine + ex.StackTrace;
    }

}).WithName("Generic");
app.Map("/auth/{op}", async (HttpRequest request, HttpResponse response, string op, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, RoleManager<ApplicationRole> roleManager) => {
    string body = "";
    try
    {
        response.ContentType = "application/json";
        op = op.ToLower();
        using (var stream = new StreamReader(request.Body)){
            body = await stream.ReadToEndAsync();
        }
        return (await Auth.ProcessRequest(request, response, op, body, userManager, signInManager, roleManager)).ToString();
    }
    catch (Exception ex) {
        Logger.Log("generic/" + op + "    " + ex.Message + Environment.NewLine + body + Environment.NewLine + ex.StackTrace);
        response.StatusCode = 500;
        return ex.Message + Environment.NewLine + ex.StackTrace;
    }

}).WithName("Auth");
app.Map("/file/upload", async (HttpContext context) => {
    var form = await context.Request.ReadFormAsync();
    var files = form.Files;
    string serverPath = "Docs";
    string uploadsFolder = Path.Combine(rootPath, serverPath);
    if (!Directory.Exists(uploadsFolder))
        Directory.CreateDirectory(uploadsFolder);
    JArray ret = [];
    JObject tmp;
    foreach (var file in files) {
        tmp = [];
        string serverName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        string filePath = Path.Combine(uploadsFolder, serverName);
        using (var stream = new FileStream(filePath, FileMode.Create)) {
            await file.CopyToAsync(stream);
        }
        tmp["fileName"] = file.FileName;
        tmp["serverName"] = serverName;
        ret.Add(tmp);
    }
    return WebBDUt.NewBasicJResponse(false, ret).ToString();
});

/*************************************************************************************************************/
/***************************** Servicios de prueba - recibe texto guarda *************************************/
/*************************************************************************************************************/

/*ejemplo*
 * app.MapPost("/prueba/", async (HttpRequest request, HttpResponse response) => {
    string body = "";
    using (var stream = new StreamReader(request.Body)) {
        body = await stream.ReadToEndAsync();
    }
    return "OK";
});*/

/*app.MapPost("/prueba", async (HttpRequest request, HttpResponse response) =>
{
    // Leer el texto que llega en el body
    string body = "";
    using (var stream = new StreamReader(request.Body))
    {
        body = await stream.ReadToEndAsync();
    }

    // Guardar en archivo de texto
    string rutaArchivo = "archivo_prueba.txt";
    await File.AppendAllTextAsync(rutaArchivo, body + "\n");

    // Responder OK
    response.StatusCode = 200;
    await response.WriteAsync("Texto guardado exitosamente");
});*/

/*************************************************************************************************************/
/******************************** Servicio para guardar TRM **************************************************/
/*************************************************************************************************************/

/*app.MapPost("/trm/guardar", async (HttpRequest request, HttpResponse response) =>
{
    try
    {
        // Leer el JSON que llega
        string body = "";
        using (var stream = new StreamReader(request.Body))
        {
            body = await stream.ReadToEndAsync();
        }

        // Convertir el JSON a objeto
        var datos = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(body);

        if (datos == null || !datos.ContainsKey("fecha") || !datos.ContainsKey("valor"))
        {
            response.StatusCode = 400;
            await response.WriteAsync("Error: Se requieren 'fecha' y 'valor'");
            return;
        }

        string fecha = datos["fecha"];
        string valor = datos["valor"];

        // Crear línea con formato CSV
        string linea = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss},{fecha},{valor}\n";

        // Guardar en archivo
        string rutaArchivo = "trm_datos.txt";

        // Si el archivo no existe, agregar encabezados
        if (!File.Exists(rutaArchivo))
        {
            await File.WriteAllTextAsync(rutaArchivo, "Timestamp,Fecha TRM,Valor\n");
        }

        await File.AppendAllTextAsync(rutaArchivo, linea);

        // Responder con éxito
        response.StatusCode = 200;
        response.ContentType = "application/json";
        await response.WriteAsync($"{{\"mensaje\":\"TRM guardada\",\"fecha\":\"{fecha}\",\"valor\":\"{valor}\"}}");
    }
    catch (Exception ex)
    {
        response.StatusCode = 500;
        await response.WriteAsync($"Error: {ex.Message}");
    }
});*/

/****** EXTRAER DATOS DE TRM EN CSV****/
/*app.MapPost("/trm/guardar", async (HttpRequest request, HttpResponse response) =>
{
    try
    {
        // Leer el JSON que llega
        string body = "";
        using (var stream = new StreamReader(request.Body))
        {
            body = await stream.ReadToEndAsync();
        }

        // Convertir el JSON a objeto
        var datos = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(body);

        if (datos == null || !datos.ContainsKey("fecha") || !datos.ContainsKey("valor"))
        {
            response.StatusCode = 400;
            await response.WriteAsync("Error: Se requieren 'fecha' y 'valor'");
            return;
        }

        string fecha = datos["fecha"];
        string valor = datos["valor"];

        // Crear línea con formato CSV
        string linea = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss},{fecha},{valor}\n";

        // CAMBIO: Ahora guarda en archivo .CSV
        string rutaArchivo = "./trm_datos.csv";

        // Si el archivo no existe, agregar encabezados
        if (!File.Exists(rutaArchivo))
        {
            await File.WriteAllTextAsync(rutaArchivo, "Timestamp,Fecha TRM,Valor COP\n");
        }

        await File.AppendAllTextAsync(rutaArchivo, linea);

        // Responder con éxito
        response.StatusCode = 200;
        response.ContentType = "application/json";
        await response.WriteAsync($"{{\"mensaje\":\"TRM guardada en CSV\",\"fecha\":\"{fecha}\",\"valor\":\"{valor}\"}}");
    }
    catch (Exception ex)
    {
        response.StatusCode = 500;
        await response.WriteAsync($"Error: {ex.Message}");
    }
});*/

// Habilitar CORS
app.UseCors(policy =>
    policy.AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader());

/*************************************************************************************************************/
/******************************** Servicio para guardar TRM en BD ********************************************/
/*************************************************************************************************************/

app.MapPost("/trm/guardar", async (HttpRequest request, HttpResponse response, IConfiguration configuration) =>
{
    try
    {
        // Leer el JSON que llega
        string body = "";
        using (var stream = new StreamReader(request.Body))
        {
            body = await stream.ReadToEndAsync();
        }

        // Convertir el JSON a objeto
        var datos = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(body);

        if (datos == null || !datos.ContainsKey("fecha") || !datos.ContainsKey("valor"))
        {
            response.StatusCode = 400;
            await response.WriteAsync("Error: Se requieren 'fecha' y 'valor'");
            return;
        }

        string fecha = datos["fecha"];
        string valor = datos["valor"];

        // Obtener la cadena de conexión desde appsettings.json
        string connectionString = configuration.GetConnectionString("FedEx");

        // Conectar a SQL Server y llamar el procedimiento almacenado
        using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();

            using (var cmd = new SqlCommand("Wp_Ins_TRM", conn))
            {
                cmd.CommandType = System.Data.CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@Fecha_Expedicion", DateTime.Now.ToString("yyyy-MM-dd"));
                cmd.Parameters.AddWithValue("@Fecha_Desde", fecha);
                cmd.Parameters.AddWithValue("@Fecha_Hasta", fecha);
                cmd.Parameters.AddWithValue("@TRM", valor);

                var resultado = await cmd.ExecuteScalarAsync();

                Console.WriteLine($"? TRM guardada en BD: {fecha} - {valor}");
            }
        }

        // guardar en CSV
        string linea = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss},{fecha},{valor}\n";
        string rutaArchivo = "trm_datos.csv";

        if (!File.Exists(rutaArchivo))
        {
            await File.WriteAllTextAsync(rutaArchivo, "Timestamp,Fecha TRM,Valor COP\n");
        }

        await File.AppendAllTextAsync(rutaArchivo, linea);

        // Responder con éxito
        response.StatusCode = 200;
        response.ContentType = "application/json";
        await response.WriteAsync($"{{\"mensaje\":\"TRM guardada en base de datos\",\"fecha\":\"{fecha}\",\"valor\":\"{valor}\"}}");
    }
    catch (SqlException sqlEx)
    {
        Console.WriteLine($"? Error SQL: {sqlEx.Message}");
        response.StatusCode = 500;
        await response.WriteAsync($"Error de base de datos: {sqlEx.Message}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"? Error: {ex.Message}");
        response.StatusCode = 500;
        await response.WriteAsync($"Error: {ex.Message}");
    }
});

/*************************************************************************************************************/
/****************************** Servicio para CONSULTAR TRM desde BD *****************************************/
/*************************************************************************************************************/

app.MapGet("/trm/consultar", async (HttpResponse response, IConfiguration configuration) =>
{
    try
    {
        // Obtener la cadena de conexión
        string connectionString = configuration.GetConnectionString("FedEx");

        // Lista para almacenar los resultados
        var listaTRM = new List<Dictionary<string, object>>();

        // Conectar a SQL Server y llamar el procedimiento almacenado
        using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();

            using (var cmd = new SqlCommand("Wp_Get_TRM", conn))
            {
                cmd.CommandType = System.Data.CommandType.StoredProcedure;

                // Ejecutar el procedimiento y leer los resultados
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var registro = new Dictionary<string, object>
                        {
                            { "id", reader["Id_TRM"] },
                            { "fechaExpedicion", reader["Fecha_Expedicion"]?.ToString() ?? "" },
                            { "fechaDesde", reader["Fecha_Desde"]?.ToString() ?? "" },
                            { "fechaHasta", reader["Fecha_Hasta"]?.ToString() ?? "" },
                            { "trm", reader["TRM"]?.ToString() ?? "" },
                            { "activo", reader["Is_Active"] },
                            { "fechaCreacion", reader["Created_On"] },
                            { "creadoPor", reader["Created_By"]?.ToString() ?? "" }
                        };
                        listaTRM.Add(registro);
                    }
                }
            }
        }

        Console.WriteLine($"? Se consultaron {listaTRM.Count} registros de TRM");

        // Responder con los datos en formato JSON
        response.StatusCode = 200;
        response.ContentType = "application/json";

        var jsonResponse = System.Text.Json.JsonSerializer.Serialize(new
        {
            mensaje = "Datos obtenidos exitosamente",
            total = listaTRM.Count,
            datos = listaTRM
        });

        await response.WriteAsync(jsonResponse);
    }
    catch (SqlException sqlEx)
    {
        Console.WriteLine($"? Error SQL: {sqlEx.Message}");
        response.StatusCode = 500;
        await response.WriteAsync($"{{\"error\":\"Error de base de datos: {sqlEx.Message}\"}}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"? Error: {ex.Message}");
        response.StatusCode = 500;
        await response.WriteAsync($"{{\"error\":\"Error: {ex.Message}\"}}");
    }
});
app.Run();

using System.Runtime.CompilerServices;

namespace orca.Code.Logger {
    public static class Logger {
        public static bool IsEnabled { get; private set; } = false;
        private static string RootPath = "";
        private static string DefaultLog = "";
        public static string LastError = "";
        public static void Init(string rootPath) { 
            IsEnabled = true;
            RootPath = Path.Combine(rootPath, "Logs");
            if(!Directory.Exists(RootPath))
                Directory.CreateDirectory(RootPath);
            DefaultLog = Path.Combine(RootPath, "log.txt");
        }
        [MethodImpl(MethodImplOptions.Synchronized)]
        public static void Log(string? text = null, string logName = "") {
            try {
                if (IsEnabled) {
                    if (text == null) text = "";
                    if (logName == null) logName = "";
                    if (logName == "")
                        File.AppendAllText(DefaultLog, DateTime.Now.ToString("yyyy-MM-dd hh:mm:ss") + "\t" + text + Environment.NewLine);
                    else
                        File.AppendAllText(Path.Combine(RootPath, logName), DateTime.Now.ToString("yyyy-MM-dd hh:mm:ss") + "\t" + text + Environment.NewLine);
                }
            } catch (Exception ex){
                LastError = ex.Message;
            }
        }
    }
}

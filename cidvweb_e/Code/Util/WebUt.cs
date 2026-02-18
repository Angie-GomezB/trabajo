using DocumentFormat.OpenXml.Drawing;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Web;

/// <summary>
/// Summary description for WebUt
/// </summary>
public static class WebUt {
    public static async Task<JObject> WebRequest(string url, string method, string body, string contentType, Dictionary<string, string> headers = null) {
        using var client = new HttpClient();

        StringContent content = null;
        if(body != null && contentType != null && body != "" && contentType != "")
            content = new StringContent(body, Encoding.UTF8, contentType);
        if (headers != null)
            foreach (var item in headers) {
                client.DefaultRequestHeaders.Add(item.Key, item.Value);
            }
        method = method.ToLower();
        HttpResponseMessage response = null;
        if(method == "post")
            response = await client.PostAsync(url, content);
        else if (method == "put")
            response = await client.PutAsync(url, content);
        else if (method == "delete")
            response = await client.DeleteAsync(url);
        else if (method == "get")
            response = await client.GetAsync(url);
        if (response == null)
            throw new Exception("Method not implemented: " + method);

        var responseString = await response.Content.ReadAsStringAsync();
        JObject ret = null;
        if (responseString == "" && (response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.NoContent))
            ret =  new JObject();
        else
            ret = JObject.Parse(responseString);
        ret["__StatusCode"] = response.StatusCode.ToString();
        return ret;
    }
    public static string GetContentType(string fileExt) {
        string ret = "";
        switch (fileExt.ToLower()) {
            case ".txt":
                ret = "text/plain"; break;
            case ".xml":
                ret = "text/xml"; break;
            case ".html":
                ret = "text/html"; break;
            case ".jpeg":
                ret = "image/jpeg"; break;
            case ".jpg":
                ret = "image/jpeg"; break;
            case ".png":
                ret = "image/png"; break;
            case ".mpeg":
                ret = "audio/mpeg"; break;
            case ".ogg":
                ret = "audio/ogg"; break;
            case ".mp4":
                ret = "video/mp4"; break;
            case ".pdf":
                ret = "application/pdf"; break;
            case ".tiff":
                ret = "image/tiff"; break;
            case ".tif":
                ret = "image/tif"; break;
            default:
                ret = "application/octet-stream"; break;
        }
        return ret;
    }
}
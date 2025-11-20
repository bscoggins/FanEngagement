using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FanEngagement.Tests;

public static class JsonHelper
{
    private static readonly JsonSerializerOptions _jsonOptions = CreateJsonOptions();

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }

    public static JsonSerializerOptions GetJsonOptions() => _jsonOptions;

    public static async Task<T?> ReadFromJsonAsync<T>(this HttpContent content)
    {
        return await content.ReadFromJsonAsync<T>(_jsonOptions);
    }
}

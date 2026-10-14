using System.Reflection;

namespace DoneToday.Api.Services;

public static class AppRelease
{
    public static string Version => typeof(AppRelease).Assembly
        .GetCustomAttribute<AssemblyInformationalVersionAttribute>()!
        .InformationalVersion.Split('+')[0];
}

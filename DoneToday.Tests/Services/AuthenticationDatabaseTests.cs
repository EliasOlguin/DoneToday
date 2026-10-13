using DoneToday.Api.Data;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace DoneToday.Tests.Services;

public class AuthenticationDatabaseTests
{
    [Fact]
    public void DevelopmentReusesConnectionDetailsButChangesOnlyDatabaseName()
    {
        var configuration = Config(new()
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=old_demo;Username=test;Password=fake-test-password",
            ["DevelopmentDatabase:Name"] = "donetoday_auth"
        });
        var result = new NpgsqlConnectionStringBuilder(AuthenticationDatabase.GetConnectionString(configuration, true));
        Assert.Equal("donetoday_auth", result.Database);
        Assert.Equal("test", result.Username);
        Assert.Equal("old_demo", new NpgsqlConnectionStringBuilder(configuration.GetConnectionString("DefaultConnection")).Database);
    }

    [Fact]
    public void RefusesToUseThePreviousDemoDatabase()
    {
        var configuration = Config(new()
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=old_demo",
            ["ConnectionStrings:AuthenticationConnection"] = "Host=localhost;Database=old_demo"
        });
        Assert.Throws<InvalidOperationException>(() => AuthenticationDatabase.GetConnectionString(configuration, true));
    }

    [Fact]
    public void ProductionRequiresAnExplicitConnection()
    {
        var configuration = Config(new()
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=old_demo",
            ["DevelopmentDatabase:Name"] = "donetoday_auth"
        });
        Assert.Throws<InvalidOperationException>(() => AuthenticationDatabase.GetConnectionString(configuration, false));
    }

    private static IConfiguration Config(Dictionary<string, string?> values) => new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}

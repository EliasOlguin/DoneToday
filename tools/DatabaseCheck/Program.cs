using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using Microsoft.Extensions.Configuration;
using Npgsql;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Path.GetFullPath("DoneToday"))
    .AddJsonFile("appsettings.json")
    .AddJsonFile("appsettings.Development.json")
    .AddUserSecrets<User>()
    .AddEnvironmentVariables()
    .Build();
var target = AuthenticationDatabase.GetConnectionString(configuration, true);
await using var auth = new NpgsqlConnection(target);
await auth.OpenAsync();
await using var counts = new NpgsqlCommand("SELECT (SELECT count(*) FROM \"Users\"), (SELECT count(*) FROM \"Habits\"), (SELECT count(*) FROM \"__EFMigrationsHistory\")", auth);
await using (var result = await counts.ExecuteReaderAsync())
{
    await result.ReadAsync();
    Console.WriteLine($"Identity database: {auth.Database}; users: {result.GetInt64(0)}; habits: {result.GetInt64(1)}; applied migrations: {result.GetInt64(2)}");
}
var original = configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrWhiteSpace(original))
{
    await using var demo = new NpgsqlConnection(original);
    await demo.OpenAsync();
    await using var check = new NpgsqlCommand("SELECT count(*) FROM \"__EFMigrationsHistory\" WHERE \"MigrationId\" LIKE '%AddIdentityUsers'", demo);
    if ((long)(await check.ExecuteScalarAsync())! != 0) throw new InvalidOperationException("The previous demo database unexpectedly has the Identity migration.");
    Console.WriteLine("Previous demo database: Identity migration not applied. Read-only verification complete.");
}

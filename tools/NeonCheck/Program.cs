using DoneToday.Api.Entities;
using DoneToday.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

var configuration = new ConfigurationBuilder().AddUserSecrets<User>().Build();
var saved = configuration.GetConnectionString("ProductionConnection");
if (string.IsNullOrWhiteSpace(saved))
{
    Console.Error.WriteLine("ProductionConnection is missing from user secrets.");
    return 1;
}
try
{
    var settings = new NpgsqlConnectionStringBuilder(saved)
    {
        SslMode = SslMode.VerifyFull, Timeout = 15, CommandTimeout = 15
    };
    if (settings.Host?.EndsWith(".neon.tech", StringComparison.OrdinalIgnoreCase) != true)
    {
        Console.Error.WriteLine("The saved connection does not point to a Neon host. No connection attempted.");
        return 1;
    }
    await using var connection = new NpgsqlConnection(settings.ConnectionString);
    await connection.OpenAsync();
    await using var command = new NpgsqlCommand("""
        SELECT current_database(), current_setting('server_version'),
          (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'),
          EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '__EFMigrationsHistory')
        """, connection);
    await using var reader = await command.ExecuteReaderAsync();
    await reader.ReadAsync();
    Console.WriteLine("PASS: connected to Neon using TLS with certificate and hostname verification.");
    Console.WriteLine($"Database: {reader.GetString(0)}; PostgreSQL: {reader.GetString(1)}; public tables: {reader.GetInt64(2)}; EF history exists: {reader.GetBoolean(3)}.");
    var tableCount = reader.GetInt64(2);
    var hasHistory = reader.GetBoolean(3);
    await reader.CloseAsync();
    if (args.Contains("--migrate"))
    {
        if (tableCount > 0 && !hasHistory)
        {
            Console.Error.WriteLine("Existing tables without DoneToday migration history were found. Migration cancelled.");
            return 1;
        }
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(settings.ConnectionString).Options;
        await using var context = new AppDbContext(options);
        if (hasHistory)
        {
            var existingMigrations = await context.Database.GetAppliedMigrationsAsync();
            if (existingMigrations.Except(context.Database.GetMigrations()).Any())
            {
                Console.Error.WriteLine("Migration history belongs to another application. Migration cancelled.");
                return 1;
            }
        }
        await context.Database.MigrateAsync();
        var applied = (await context.Database.GetAppliedMigrationsAsync()).Count();
        Console.WriteLine($"PASS: DoneToday schema prepared in Neon; applied migrations: {applied}.");
    }
    else Console.WriteLine("Read-only check completed. No database changes were made.");
    Console.WriteLine("Credentials were not printed. Local connection settings were not changed.");
    return 0;
}
catch (Exception exception) when (exception is ArgumentException or NpgsqlException or TimeoutException)
{
    Console.Error.WriteLine($"Neon connection check failed ({exception.GetType().Name}). Credentials were not printed.");
    return 1;
}

using DoneToday.Api.Data;
using DoneToday.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

var root = Directory.GetCurrentDirectory();
var configuration = new ConfigurationBuilder().SetBasePath(Path.Combine(root, "DoneToday"))
    .AddJsonFile("appsettings.json").AddJsonFile("appsettings.Development.json")
    .AddUserSecrets<User>().Build();
var connection = new NpgsqlConnectionStringBuilder(AuthenticationDatabase.GetConnectionString(configuration, true))
    { Database = "donetoday_deployment_test" };
var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection.ConnectionString).Options;
await using var context = new AppDbContext(options);
await context.Database.MigrateAsync();
var output = Path.Combine(root, ".local", "deployment", "preview-connection.txt");
Directory.CreateDirectory(Path.GetDirectoryName(output)!);
File.WriteAllText(output, connection.ConnectionString);
Console.WriteLine("Isolated deployment test database migrated. Connection saved under .local/deployment; credentials were not printed.");

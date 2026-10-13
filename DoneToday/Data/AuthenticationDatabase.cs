using Npgsql;

namespace DoneToday.Api.Data;

public static class AuthenticationDatabase
{
    public static string GetConnectionString(IConfiguration configuration, bool development)
    {
        var original = configuration.GetConnectionString("DefaultConnection");
        var explicitConnection = configuration.GetConnectionString("AuthenticationConnection");
        NpgsqlConnectionStringBuilder selected;
        if (!string.IsNullOrWhiteSpace(explicitConnection))
        {
            selected = new NpgsqlConnectionStringBuilder(explicitConnection);
        }
        else if (development && !string.IsNullOrWhiteSpace(original))
        {
            var database = configuration["DevelopmentDatabase:Name"];
            if (string.IsNullOrWhiteSpace(database))
                throw new InvalidOperationException("Configure a separate development database for Identity.");
            selected = new NpgsqlConnectionStringBuilder(original) { Database = database };
        }
        else
        {
            throw new InvalidOperationException("ConnectionStrings:AuthenticationConnection is required outside development.");
        }
        if (string.IsNullOrWhiteSpace(selected.Database))
            throw new InvalidOperationException("The Identity connection must specify a database name.");
        if (!string.IsNullOrWhiteSpace(original))
        {
            var previous = new NpgsqlConnectionStringBuilder(original);
            if (string.Equals(selected.Host, previous.Host, StringComparison.OrdinalIgnoreCase) &&
                selected.Port == previous.Port &&
                string.Equals(selected.Database, previous.Database, StringComparison.Ordinal))
                throw new InvalidOperationException("Identity must use a different database from the previous demo connection.");
        }
        return selected.ConnectionString;
    }
}

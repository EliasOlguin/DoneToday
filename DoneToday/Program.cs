using DoneToday.Api.Data;
using DoneToday.Api.Services;
using Microsoft.EntityFrameworkCore;
using DoneToday.Api.Entities;
using DoneToday.Api.Services.Email;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);
ProductionHosting.Configure(builder);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDoneTodayIdentity();
builder.Services.AddDoneTodayGoogle(builder.Configuration);
builder.Services.AddAntiforgery(options =>
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("authentication", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ =>
                new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                {
                    PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0
                }));
});

builder.Services.AddOptions<EmailOptions>()
    .Bind(builder.Configuration.GetSection(EmailOptions.SectionName))
    .ValidateDataAnnotations();
if (string.Equals(builder.Configuration["Email:Provider"], "Brevo", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddOptions<BrevoEmailOptions>().Bind(builder.Configuration.GetSection("Email"))
        .ValidateDataAnnotations().ValidateOnStart();
    builder.Services.AddHttpClient<BrevoEmailSender>(client => client.Timeout = TimeSpan.FromSeconds(20));
    builder.Services.AddTransient<IEmailSender<User>>(services => services.GetRequiredService<BrevoEmailSender>());
}
else builder.Services.AddTransient<IEmailSender<User>, SmtpEmailSender>();

// services
builder.Services.AddScoped<StreakService>();
builder.Services.AddScoped<ProgressService>();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString =
        AuthenticationDatabase.GetConnectionString(builder.Configuration, builder.Environment.IsDevelopment());

    options.UseNpgsql(connectionString);
});

var app = builder.Build();
if (builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment()) app.UseForwardedHeaders();
app.UseHttpsRedirection();
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
// API errors must stay API responses rather than returning the SPA HTML.
app.MapMethods("/api/{**path}", new[] { "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS" },
    () => Results.NotFound());
if (!app.Environment.IsDevelopment()) app.MapFallbackToFile("index.html");

app.Run();

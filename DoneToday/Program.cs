using DoneToday.Api.Data;
using DoneToday.Api.Services;
using Microsoft.EntityFrameworkCore;
using DoneToday.Api.Entities;
using DoneToday.Api.Services.Email;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDoneTodayIdentity();

builder.Services.AddOptions<EmailOptions>()
    .Bind(builder.Configuration.GetSection(EmailOptions.SectionName))
    .ValidateDataAnnotations();
builder.Services.AddTransient<IEmailSender<User>, SmtpEmailSender>();

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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

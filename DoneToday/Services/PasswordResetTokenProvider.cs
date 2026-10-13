using DoneToday.Api.Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace DoneToday.Api.Services;

public class PasswordResetTokenProvider(IDataProtectionProvider protection,
    ILogger<DataProtectorTokenProvider<User>> logger)
    : DataProtectorTokenProvider<User>(protection,
        Microsoft.Extensions.Options.Options.Create(new DataProtectionTokenProviderOptions
        {
            Name = "DoneToday.PasswordReset", TokenLifespan = TimeSpan.FromHours(1)
        }), logger);

using System.Security.Cryptography;
using System.Text;
using DoneToday.Api.Entities;

namespace DoneToday.Api.Services.Notifications;

public static class DeviceAuthorization
{
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public static string Stamp(User user) => Hash(user.SecurityStamp ?? "");
    public static bool IsCurrent(NotificationDevice device, User user) => user.Id == device.UserId &&
        user.EmailConfirmed && !user.IsGuest && !string.IsNullOrEmpty(user.SecurityStamp) && device.AuthorizationStampHash == Stamp(user);
}

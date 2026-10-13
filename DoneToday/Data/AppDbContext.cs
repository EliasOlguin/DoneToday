using DoneToday.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;

namespace DoneToday.Api.Data;

public class AppDbContext : IdentityDbContext<User, IdentityRole<int>, int>, IDataProtectionKeyContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; } = null!;
    public DbSet<HabitSchedule> HabitSchedules => Set<HabitSchedule>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().ToTable("Users");
        modelBuilder.Entity<User>().Property(u => u.Email).IsRequired();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.NormalizedEmail)
            .IsUnique();

        modelBuilder.Entity<HabitSchedule>()
            .HasIndex(hs => new 
            {
                hs.HabitId,
                hs.DayOfWeek,
                hs.ValidFrom
            })
            .IsUnique();

        modelBuilder.Entity<HabitCompletion>()
            .HasIndex(hc => new { hc.HabitId, hc.Date })
            .IsUnique();

        modelBuilder.Entity<Habit>()
            .HasOne(h => h.User)
            .WithMany(u => u.Habits)
            .HasForeignKey(h => h.UserId);

        modelBuilder.Entity<HabitSchedule>()
            .HasOne(hs => hs.Habit)
            .WithMany(h => h.Schedules)
            .HasForeignKey(hs => hs.HabitId);

        modelBuilder.Entity<HabitCompletion>()
            .HasOne(hc => hc.Habit)
            .WithMany(h => h.Completions)
            .HasForeignKey(hc => hc.HabitId);
    }
}

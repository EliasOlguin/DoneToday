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
    public DbSet<HabitGoal> HabitGoals => Set<HabitGoal>();
    public DbSet<HabitDayProgress> HabitDayProgress => Set<HabitDayProgress>();
    public DbSet<HabitProgressEntry> HabitProgressEntries => Set<HabitProgressEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().ToTable("Users");
        modelBuilder.Entity<Habit>().Property(h => h.GoalTarget).HasPrecision(12, 3);
        modelBuilder.Entity<Habit>().Property(h => h.GoalUnit).HasMaxLength(20);
        modelBuilder.Entity<HabitGoal>().Property(g => g.Target).HasPrecision(12, 3);
        modelBuilder.Entity<HabitGoal>().Property(g => g.Unit).HasMaxLength(20);
        modelBuilder.Entity<HabitGoal>().HasIndex(g => new { g.HabitId, g.ValidFrom }).IsUnique();
        modelBuilder.Entity<HabitGoal>().HasOne(g => g.Habit).WithMany(h => h.Goals).HasForeignKey(g => g.HabitId);
        modelBuilder.Entity<HabitDayProgress>().Property(p => p.Target).HasPrecision(12, 3);
        modelBuilder.Entity<HabitDayProgress>().Property(p => p.Amount).HasPrecision(12, 3);
        modelBuilder.Entity<HabitDayProgress>().Property(p => p.Unit).HasMaxLength(20);
        modelBuilder.Entity<HabitDayProgress>().HasIndex(p => new { p.HabitId, p.Date }).IsUnique();
        modelBuilder.Entity<HabitDayProgress>().HasOne(p => p.Habit).WithMany(h => h.Progress).HasForeignKey(p => p.HabitId);
        modelBuilder.Entity<HabitProgressEntry>().Property(p => p.Amount).HasPrecision(12, 3);
        modelBuilder.Entity<HabitProgressEntry>().Property(p => p.ResultingAmount).HasPrecision(12, 3);
        modelBuilder.Entity<HabitProgressEntry>().HasIndex(p => new { p.HabitId, p.OperationId }).IsUnique();
        modelBuilder.Entity<HabitProgressEntry>().HasOne(e => e.Progress).WithMany(p => p.Entries).HasForeignKey(e => e.HabitDayProgressId);
        modelBuilder.Entity<Habit>().Property(h => h.Icon).HasMaxLength(20).HasDefaultValue("habit");
        modelBuilder.Entity<User>().Property(u => u.Email).IsRequired();
        modelBuilder.Entity<User>().Property(u => u.TimeZoneId).HasMaxLength(100);
        modelBuilder.Entity<User>().Property(u => u.DisplayName).HasMaxLength(60);
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

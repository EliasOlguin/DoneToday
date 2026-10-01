using DoneToday.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DoneToday.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitSchedule> HabitSchedules => Set<HabitSchedule>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
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
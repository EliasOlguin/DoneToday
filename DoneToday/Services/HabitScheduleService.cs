using DoneToday.Api.Entities;

namespace DoneToday.Api.Services;

public static class HabitScheduleService
{
    public static List<HabitSchedule> Update(Habit habit, IEnumerable<DayOfWeek> days, DateOnly today)
    {
        var requested = days.Distinct().ToHashSet();
        var active = habit.Schedules.Where(s => s.ValidTo == null).ToList();
        if (requested.SetEquals(active.Select(s => s.DayOfWeek))) return [];

        var removed = active.Where(s => s.ValidFrom > today).ToList();
        foreach (var schedule in active)
        {
            if (schedule.ValidFrom > today) habit.Schedules.Remove(schedule);
            else schedule.ValidTo = today;
        }
        foreach (var day in requested)
        {
            habit.Schedules.Add(new HabitSchedule
            {
                HabitId = habit.Id,
                DayOfWeek = day,
                ValidFrom = today.AddDays(1)
            });
        }
        return removed;
    }
}

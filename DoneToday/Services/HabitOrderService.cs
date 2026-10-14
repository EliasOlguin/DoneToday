using DoneToday.Api.Entities;
using System.ComponentModel.DataAnnotations;

namespace DoneToday.Api.Services;

public static class HabitOrderService
{
    public static bool TryApply(IReadOnlyCollection<Habit> habits, IReadOnlyList<int> ids)
    {
        if (ids.Count != habits.Count || ids.Distinct().Count() != ids.Count ||
            !ids.ToHashSet().SetEquals(habits.Select(h => h.Id))) return false;
        var byId = habits.ToDictionary(h => h.Id);
        for (var i = 0; i < ids.Count; i++) byId[ids[i]].SortOrder = i;
        return true;
    }
}

public record OrderHabitsRequest([Required, MaxLength(1000)] int[] Ids);

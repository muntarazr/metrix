# METRIX Persistent State & Dossier Schema

## 1. Master Goals Schema (`.metrix/goals.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "version": "1.0",
  "updated_at": "2026-10-29T15:00:00Z",
  "storage_adapter": "local",
  "goals": [
    {
      "id": "goal-45day-b2b",
      "title": "45-Day B2B AI Integrations & Automation Contractor",
      "status": "active",
      "start_date": "2026-10-20",
      "estimated_completion_date": "2026-12-05",
      "mastery_target_points": 4500,
      "current_points": 63,
      "daily_cap": 75,
      "main_tasks": [
        {
          "id": "task-eng-1",
          "title": "AI Integrations & Live Systems Engineering",
          "cadence": "daily",
          "target_minutes": 90,
          "base_points": 15,
          "criteria": [
            "Active Webhook Endpoint tested with valid payload",
            "n8n or LangChain flow tested with JSON response code 200",
            "Documented Git commit with passing type-safety checks"
          ]
        }
      ]
    }
  ]
}
```

## 2. Daily Log Dossier Schema (`.metrix/logs/YYYY-MM-DD.md`)

```markdown
# METRIX Daily Evaluation Log — 2026-10-29

## Goal: 45-Day B2B AI Integrations & Automation Contractor
- **Evaluated At**: 2026-10-29T14:30:00Z
- **Daily Cap**: 75 Points
- **Earned Today**: 60 Points (80% Compliance)
- **Streak Status**: Active (Streak: 12 days)

### Task Breakdown & Evidence
| Task ID | Base | Awarded | Status | Evidence Provided |
|---|---|---|---|---|
| `task-eng-1` | 15 | 15 | COMPLETED | Webhook deployed, commit `b4cad50` verified |
| `task-sales-2` | 10 | 5 | PARTIAL | 3/5 outreach emails sent, rest delayed |

### Unflattering Reality Check
> Delivered strong backend execution on the webhook parser. However, sales outreach fell short of the daily 5-contact threshold. Momentum is acceptable, but pipeline volume will decay if sales targets are deferred again tomorrow.

### Priority Focus for Tomorrow
- Close the remaining 2 enterprise prospects before starting code tasks.
```

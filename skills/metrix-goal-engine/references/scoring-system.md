# METRIX Scoring & Mathematical Rules

## 1. Goal Points Distribution

A balanced METRIX goal consists of:
- **Mastery Target**: 100 to 500 points depending on goal scope.
- **Main Tasks**: 3 to 5 tasks per goal.
- **Task Weight**:
  - High Impact (Deep Work, Code, Writing): 10 - 15 points.
  - Medium Impact (Exercise, Study, Review): 5 - 10 points.
  - Maintenance / Supporting: 3 - 5 points.

## 2. Daily Points Cap Calculation

To avoid cramming or inflated fake progress:
- The daily cap is strictly enforced:
  $$\text{Daily Cap} = \sum (\text{Daily Tasks}) + \text{pro-rated weekly task contribution}$$
- Any points earned beyond the cap in a single 24-hour cycle are discarded.

## 3. Streak & Freeze Calculation

- **Valid Day**: Total earned points $\ge 0.6 \times \text{Daily Cap}$.
- **Rest Day**: Pre-scheduled day (maximum 2 per week). Does not advance streak, but does not break it.
- **Freeze**: Automatically consumes 1 available streak freeze if user falls below threshold on an unscheduled day.

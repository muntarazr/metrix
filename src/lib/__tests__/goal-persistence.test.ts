import { test } from "node:test";
import assert from "node:assert/strict";
import { persistGoalWithTaskTree } from "../goal-persistence.ts";

test("persistGoalWithTaskTree successfully inserts goal and tasks", async () => {
    let insertedGoal: any = null;
    let insertedSubRows: any[] = [];

    const mockSupabase = {
        from: (table: string) => {
            if (table === "goals") {
                return {
                    insert: (payload: any) => ({
                        select: () => ({
                            single: async () => {
                                insertedGoal = { id: "goal_123", ...payload };
                                return { data: insertedGoal, error: null };
                            },
                        }),
                    }),
                };
            }
            if (table === "sub_layers") {
                return {
                    insert: async (rows: any[]) => {
                        insertedSubRows = rows;
                        return { error: null };
                    },
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        },
    };

    const result = await persistGoalWithTaskTree({
        supabaseClient: mockSupabase,
        userId: "user_1",
        title: "Test Goal",
        targetPoints: 1000,
        totalDays: 30,
        tasks: [
            {
                task_description: "Run 5km",
                frequency: "daily",
                impact_weight: 4,
                time_required_minutes: 30,
                completion_criteria: "Complete run without walking",
            },
        ],
    });

    assert.equal(result.goal.id, "goal_123");
    assert.equal(result.tasksCount, 1);
    assert.equal(insertedGoal.title, "Test Goal");
    assert.equal(insertedSubRows.length, 1);
    assert.equal(insertedSubRows[0].goal_id, "goal_123");
    assert.equal(insertedSubRows[0].task_description, "Run 5km");
    assert.equal(insertedSubRows[0].impact_weight, 4);
});

test("persistGoalWithTaskTree rolls back goal when tasks insertion fails", async () => {
    let deletedGoalId: string | null = null;

    const mockSupabase = {
        from: (table: string) => {
            if (table === "goals") {
                return {
                    insert: (payload: any) => ({
                        select: () => ({
                            single: async () => ({
                                data: { id: "goal_to_rollback", ...payload },
                                error: null,
                            }),
                        }),
                    }),
                    delete: () => ({
                        eq: async (col: string, val: any) => {
                            if (col === "id") deletedGoalId = val;
                            return { error: null };
                        },
                    }),
                };
            }
            if (table === "sub_layers") {
                return {
                    insert: async () => ({
                        error: new Error("Failed to insert tasks into DB"),
                    }),
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        },
    };

    await assert.rejects(
        async () => {
            await persistGoalWithTaskTree({
                supabaseClient: mockSupabase,
                userId: "user_1",
                title: "Rollback Goal",
                targetPoints: 500,
                totalDays: 14,
                tasks: [{ task_description: "Failed Task" }],
            });
        },
        /Failed to insert tasks into DB/
    );

    assert.equal(deletedGoalId, "goal_to_rollback");
});

test("persistGoalWithTaskTree retries without schedule_days if column error occurs", async () => {
    let attempts = 0;
    let finalInsertedRows: any[] = [];

    const mockSupabase = {
        from: (table: string) => {
            if (table === "goals") {
                return {
                    insert: (payload: any) => ({
                        select: () => ({
                            single: async () => ({
                                data: { id: "goal_retry", ...payload },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === "sub_layers") {
                return {
                    insert: async (rows: any[]) => {
                        attempts++;
                        if (attempts === 1) {
                            return { error: new Error("column schedule_days does not exist") };
                        }
                        finalInsertedRows = rows;
                        return { error: null };
                    },
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        },
    };

    const result = await persistGoalWithTaskTree({
        supabaseClient: mockSupabase,
        userId: "user_1",
        title: "Retry Goal",
        targetPoints: 500,
        totalDays: 14,
        tasks: [
            {
                task_description: "Task with schedule",
                schedule_days: [1, 3, 5],
            },
        ],
    });

    assert.equal(attempts, 2);
    assert.equal(result.tasksCount, 1);
    assert.equal(finalInsertedRows[0].schedule_days, undefined);
    assert.equal(finalInsertedRows[0].task_description, "Task with schedule");
});

test("persistGoalWithTaskTree rolls back goal when sub_layers throws unexpected exception", async () => {
    let deletedGoalId: string | null = null;

    const mockSupabase = {
        from: (table: string) => {
            if (table === "goals") {
                return {
                    insert: (payload: any) => ({
                        select: () => ({
                            single: async () => ({
                                data: { id: "goal_to_rollback_on_throw", ...payload },
                                error: null,
                            }),
                        }),
                    }),
                    delete: () => ({
                        eq: async (col: string, val: any) => {
                            if (col === "id") deletedGoalId = val;
                            return { error: null };
                        },
                    }),
                };
            }
            if (table === "sub_layers") {
                return {
                    insert: async () => {
                        throw new Error("Network disconnection or unhandled error");
                    },
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        },
    };

    await assert.rejects(
        async () => {
            await persistGoalWithTaskTree({
                supabaseClient: mockSupabase,
                userId: "user_1",
                title: "Rollback On Throw Goal",
                targetPoints: 500,
                totalDays: 14,
                tasks: [{ task_description: "Task throwing" }],
            });
        },
        /Network disconnection or unhandled error/
    );

    assert.equal(deletedGoalId, "goal_to_rollback_on_throw");
});


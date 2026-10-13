import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchFullGoalExportData } from './fetcher.ts';
import { generateGoalMarkdownDossier } from './markdown.ts';
import { generateGoalJsonExport } from './json.ts';

/**
 * Utility to trigger browser file download.
 */
export function downloadExportFile(filename: string, content: string, mimeType: string) {
    if (typeof window === 'undefined') return;

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Direct exporter that fetches all goal data, generates formatted Markdown dossier,
 * and triggers immediate browser download (.md).
 */
export async function exportGoalMarkdownDirect(
    supabase: SupabaseClient,
    goal: { id: string; title: string },
    isArabic: boolean = true
): Promise<void> {
    const fullData = await fetchFullGoalExportData(supabase, goal.id);
    const md = generateGoalMarkdownDossier(fullData, isArabic);

    const cleanTitle = (goal.title || 'goal')
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-')
        .slice(0, 50);

    const filename = `${cleanTitle || 'goal'}-METRIX.md`;
    downloadExportFile(filename, md, 'text/markdown');
}

/**
 * Direct exporter that fetches all goal data, generates structured JSON export payload,
 * and triggers immediate browser download (.json).
 */
export async function exportGoalJsonDirect(
    supabase: SupabaseClient,
    goal: { id: string; title: string }
): Promise<void> {
    const fullData = await fetchFullGoalExportData(supabase, goal.id);
    const jsonStr = generateGoalJsonExport(fullData);

    const cleanTitle = (goal.title || 'goal')
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '-')
        .slice(0, 50);

    const filename = `${cleanTitle || 'goal'}-METRIX.json`;
    downloadExportFile(filename, jsonStr, 'application/json');
}

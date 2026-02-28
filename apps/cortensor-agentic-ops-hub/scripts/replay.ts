#!/usr/bin/env tsx
/**
 * Replay script: npm run replay -- taskId=<uuid>
 * Re-renders a stored task's transcript from SQLite
 */

import { getTask, getTaskLogs, getEvidenceBundle } from "../lib/db";

const args = process.argv.slice(2);
const taskIdArg = args.find((a) => a.startsWith("taskId="));

if (!taskIdArg) {
    console.error("Usage: npm run replay -- taskId=<uuid>");
    process.exit(1);
}

const taskId = taskIdArg.split("=")[1];

console.log(`\n${"=".repeat(60)}`);
console.log("  CAOH – Task Replay");
console.log(`  Task ID: ${taskId}`);
console.log(`${"=".repeat(60)}\n`);

const task = getTask(taskId);
if (!task) {
    console.error(`❌ Task not found: ${taskId}`);
    process.exit(1);
}

console.log(`📋 Goal:    ${task.goal}`);
console.log(`📅 Started: ${task.started_at}`);
console.log(`✅ Status:  ${task.status}`);
if (task.completed_at) console.log(`🏁 Ended:   ${task.completed_at}`);
console.log("");

const logs = getTaskLogs(taskId);
if (logs.length === 0) {
    console.log("No logs found for this task.");
} else {
    console.log(`${"─".repeat(60)}`);
    console.log(`AGENT TRANSCRIPT (${logs.length} entries)`);
    console.log(`${"─".repeat(60)}`);
    for (const log of logs) {
        const time = log.timestamp.split("T")[1]?.split(".")[0] || "";
        const prefix =
            log.level === "error" ? "❌" : log.level === "warn" ? "⚠️" : "→";
        console.log(`${time}  [${log.agent_name}]  ${prefix} ${log.message}`);
    }
}

const bundle = getEvidenceBundle(taskId);
if (bundle) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("EVIDENCE BUNDLE SUMMARY");
    console.log(`${"─".repeat(60)}`);
    console.log(`Overall Score:   ${bundle.overallScore}/100`);
    console.log(`Consensus Level: ${bundle.consensusLevel}`);
    console.log(`Session IDs:     ${bundle.sessionIds.join(", ")}`);
    console.log(`Rubric Runs:     ${bundle.rubricScores.length}`);
    bundle.rubricScores.forEach((r, i) => {
        console.log(`  Run ${i + 1}: ${r.score}/100 – ${r.consensusLevel} – ${r.reasoning}`);
    });
}

if (task.final_report) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("FINAL REPORT (first 500 chars)");
    console.log(`${"─".repeat(60)}`);
    console.log(task.final_report.substring(0, 500));
    if (task.final_report.length > 500) console.log("... [truncated]");
}

console.log(`\n${"=".repeat(60)}\n`);

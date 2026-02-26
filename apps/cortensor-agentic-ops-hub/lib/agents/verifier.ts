/**
 * VerifierAgent – 3x redundant Cortensor calls + rubric scoring
 */

import { verifyWithPoI } from "../verify-poi";
import { saveEvidenceBundle } from "../db";
import { appendLog } from "../db";
import { EvidenceBundle } from "../evidence";

export interface VerifierOutput {
    evidenceBundle: EvidenceBundle;
    verified: boolean;
    summary: string;
}

export async function runVerifierAgent(
    taskId: string,
    contentToVerify: string,
    onProgress?: (step: string) => void
): Promise<VerifierOutput> {
    const log = (msg: string, level: "info" | "warn" | "error" = "info") => {
        appendLog({
            task_id: taskId,
            agent_name: "VerifierAgent",
            message: msg,
            timestamp: new Date().toISOString(),
            level,
        });
        onProgress?.(msg);
    };

    log("🔬 VerifierAgent activated. Running 3x PoI verification loop...");

    const evidenceBundle = await verifyWithPoI(
        contentToVerify,
        parseInt(process.env.SESSION_ID || "1"),
        log
    );

    // Override taskId to match parent task for correlation
    evidenceBundle.taskId = taskId;

    // Persist evidence
    saveEvidenceBundle(evidenceBundle);

    const verified = evidenceBundle.overallScore >= 70;
    const summary = `PoI Verification: Score ${evidenceBundle.overallScore}/100 | Consensus: ${evidenceBundle.consensusLevel} | ${verified ? "✅ PASSED" : "⚠️ LOW CONFIDENCE"}`;

    log(summary, verified ? "info" : "warn");

    return {
        evidenceBundle,
        verified,
        summary,
    };
}

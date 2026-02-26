/**
 * verifyWithPoI – 3x redundant inference with rubric scoring
 * Core reliability feature: run 3 different prompts → rubric agent → evidence bundle
 */

import { callCortensor, CortensorEvidence } from "./cortensor";
import { scoreWithRubric } from "./rubric";
import { buildEvidenceBundle, EvidenceBundle } from "./evidence";
import { v4 as uuidv4 } from "uuid";

export async function verifyWithPoI(
    originalPrompt: string,
    sessionId?: number,
    onProgress?: (step: string) => void
): Promise<EvidenceBundle> {
    const taskId = uuidv4();
    const sid = sessionId ?? parseInt(process.env.SESSION_ID || "1");

    onProgress?.("🔄 Starting 3x redundant PoI inference...");

    // Slightly varied prompts to test consistency
    const prompts = [
        originalPrompt,
        `${originalPrompt}\n\n(Please be concise and structured.)`,
        `Analyze the following and provide a JSON-structured response: ${originalPrompt}`,
    ];

    // Run all 3 inferences in parallel
    const [result1, result2, result3] = await Promise.all(
        prompts.map((p, i) => {
            onProgress?.(`  ↳ Inference ${i + 1}/3 sent to Cortensor router...`);
            return callCortensor(p, sid);
        })
    );

    const results = [result1, result2, result3];
    const threeRawResponses = results.map((r) => r.content);
    const evidenceList: CortensorEvidence[] = results.map((r) => r.evidence);

    onProgress?.("🧮 Running RubricAgent scoring on all 3 responses...");

    // Score each response with rubric agent
    const rubricScores = await Promise.all(
        results.map((r, i) =>
            scoreWithRubric(originalPrompt, r.content, i)
        )
    );

    onProgress?.("📊 Aggregating final output...");

    // Pick highest-scoring response as final output
    const bestIdx = rubricScores.reduce(
        (best, score, i) => (score.score > rubricScores[best].score ? i : best),
        0
    );
    const finalAggregatedOutput = threeRawResponses[bestIdx];

    onProgress?.("✅ Evidence bundle built. PoI verification complete.");

    return buildEvidenceBundle({
        taskId,
        originalPrompt,
        threeRawResponses,
        rubricScores,
        finalAggregatedOutput,
        evidenceList,
    });
}

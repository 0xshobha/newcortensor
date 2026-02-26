/**
 * Evidence bundle builder
 * Constructs verifiable JSON evidence bundles from Cortensor inference runs
 */

import { CortensorEvidence } from "./cortensor";

export interface EvidenceBundle {
    taskId: string;
    timestamp: string;
    originalPrompt: string;
    threeRawResponses: string[];
    rubricScores: RubricScore[];
    finalAggregatedOutput: string;
    sessionIds: number[];
    evidenceList: CortensorEvidence[];
    overallScore: number;
    consensusLevel: "HIGH" | "MEDIUM" | "LOW";
    downloadUrl?: string;
}

export interface RubricScore {
    score: number;
    reasoning: string;
    consensusLevel: "HIGH" | "MEDIUM" | "LOW";
    runIndex: number;
}

export function buildEvidenceBundle(params: {
    taskId: string;
    originalPrompt: string;
    threeRawResponses: string[];
    rubricScores: RubricScore[];
    finalAggregatedOutput: string;
    evidenceList: CortensorEvidence[];
}): EvidenceBundle {
    const sessionIds = [
        ...new Set(params.evidenceList.map((e) => e.sessionId)),
    ];

    const overallScore =
        params.rubricScores.length > 0
            ? Math.round(
                params.rubricScores.reduce((sum, r) => sum + r.score, 0) /
                params.rubricScores.length
            )
            : 0;

    const highCount = params.rubricScores.filter(
        (r) => r.consensusLevel === "HIGH"
    ).length;
    const consensusLevel: "HIGH" | "MEDIUM" | "LOW" =
        highCount >= 2 ? "HIGH" : highCount === 1 ? "MEDIUM" : "LOW";

    return {
        taskId: params.taskId,
        timestamp: new Date().toISOString(),
        originalPrompt: params.originalPrompt,
        threeRawResponses: params.threeRawResponses,
        rubricScores: params.rubricScores,
        finalAggregatedOutput: params.finalAggregatedOutput,
        sessionIds,
        evidenceList: params.evidenceList,
        overallScore,
        consensusLevel,
        downloadUrl: `/api/evidence/${params.taskId}`,
    };
}

export function formatEvidenceAsMarkdown(bundle: EvidenceBundle): string {
    return `# Evidence Bundle – Task \`${bundle.taskId}\`

**Timestamp:** ${bundle.timestamp}  
**Overall Score:** ${bundle.overallScore}/100  
**Consensus Level:** ${bundle.consensusLevel}  
**Sessions Used:** ${bundle.sessionIds.join(", ")}

## Original Prompt
\`\`\`
${bundle.originalPrompt}
\`\`\`

## Three Redundant Inferences
${bundle.threeRawResponses
            .map(
                (r, i) => `### Run ${i + 1}
\`\`\`
${r}
\`\`\``
            )
            .join("\n\n")}

## Rubric Scores
| Run | Score | Consensus | Reasoning |
|-----|-------|-----------|-----------|
${bundle.rubricScores
            .map((r) => `| ${r.runIndex + 1} | ${r.score}/100 | ${r.consensusLevel} | ${r.reasoning} |`)
            .join("\n")}

## Final Aggregated Output
${bundle.finalAggregatedOutput}

## PoI Metadata
${bundle.evidenceList
            .map(
                (e, i) => `### Evidence ${i + 1}
- **Session ID:** ${e.sessionId}
- **Miners Used:** ${e.minersUsed ?? "N/A"}
- **Confidence:** ${e.confidence ? (e.confidence * 100).toFixed(1) + "%" : "N/A"}
- **Verdict:** ${e.aggregateVerdict ?? "N/A"}
- **Latency:** ${e.latencyMs ?? "N/A"}ms
- **Dispersion:** ${e.dispersion?.toFixed(3) ?? "N/A"}`
            )
            .join("\n\n")}
`;
}

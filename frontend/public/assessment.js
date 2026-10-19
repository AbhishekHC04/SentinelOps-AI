
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let latestReport = null;

  function createPanel() {
    if ($("assessmentPanel")) return $("assessmentPanel");

    const vt = $("vtPanel");
    if (!vt) {
      console.error("SentinelOps: VirusTotal panel not found.");
      return null;
    }

    const panel = document.createElement("article");
    panel.id = "assessmentPanel";
    panel.className = "panel";
    panel.style.display = "none";

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <div style="color:#a78bfa;font-size:11px;font-weight:800;letter-spacing:2px">EVIDENCE-BASED ANALYSIS</div>
          <h2 style="margin-top:8px">AI-Assisted Threat Assessment</h2>
        </div>
        <span id="assessmentRisk" class="status">Waiting for evidence</span>
      </div>

      <p id="assessmentTarget" style="font-size:13px"></p>

      <div style="border:1px solid #293851;background:#0c1525;border-radius:12px;padding:18px;margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <strong>Risk score</strong>
          <strong id="assessmentScore" style="font-size:28px">— / 100</strong>
        </div>
        <div style="height:12px;background:#293851;border-radius:20px;overflow:hidden;margin-top:14px">
          <div id="assessmentMeter" role="progressbar" aria-label="Evidence-based risk score"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
               style="width:0%;height:100%;background:#64748b;border-radius:20px;transition:width .35s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#8fa1bd;margin-top:7px">
          <span>Lower reported risk</span><span>Higher reported risk</span>
        </div>
        <p id="assessmentScoreNote" style="font-size:12px;margin-bottom:0"></p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px">
        <div style="background:#0c1525;border:1px solid #293851;border-radius:12px;padding:15px">
          <div style="color:#8fa1bd;font-size:12px">Data coverage</div>
          <strong id="assessmentCoverage" style="display:block;font-size:22px;margin-top:8px">—</strong>
          <div id="assessmentCoverageDetail" style="font-size:12px;color:#8fa1bd;margin-top:5px"></div>
        </div>
        <div style="background:#0c1525;border:1px solid #293851;border-radius:12px;padding:15px">
          <div style="color:#8fa1bd;font-size:12px">Evidence confidence</div>
          <strong id="assessmentConfidence" style="display:block;font-size:22px;margin-top:8px">—</strong>
          <div id="assessmentConfidenceDetail" style="font-size:12px;color:#8fa1bd;margin-top:5px"></div>
        </div>
      </div>

      <div style="background:#0c1525;border:1px solid #293851;border-radius:12px;padding:16px;margin-top:16px">
        <strong>Assessment summary</strong>
        <p id="assessmentSummary" style="color:#e8edf7"></p>
      </div>

      <h3 style="margin-top:22px">Evidence and reasoning</h3>
      <ul id="assessmentReasons" style="color:#cbd5e1;line-height:1.8"></ul>

      <h3 style="margin-top:22px">Recommended defensive actions</h3>
      <ol id="assessmentActions" style="color:#cbd5e1;line-height:1.8"></ol>

      <p style="font-size:12px">
        The score is a heuristic derived from the available VirusTotal detection statistics,
        not a probability of compromise or a calibrated prediction. Evidence confidence
        describes data coverage only; it does not establish that the verdict is correct.
        Missing or outdated evidence can change the assessment.
      </p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
        <button id="assessmentAddNote" type="button">Add assessment to research notes</button>
        <button id="assessmentExport" type="button">Export JSON report</button>
      </div>
      <p id="assessmentNoteMessage" style="font-size:12px;color:#a7f3d0"></p>
    `;

    vt.insertAdjacentElement("afterend", panel);

    $("assessmentAddNote").addEventListener("click", () => {
      const target = $("noteTarget")?.value;
      const notes = $("noteText");

      if (!target || !notes || !latestReport) {
        $("assessmentNoteMessage").textContent =
          "Investigate a target before adding assessment notes.";
        return;
      }

      const report = [
        "SentinelOps AI Threat Assessment",
        "Target: " + latestReport.target,
        "Risk classification: " + latestReport.risk,
        "Heuristic score: " + latestReport.score + "/100",
        "Data coverage: " + latestReport.dataCoverage.percentage + "%",
        "Evidence confidence: " + latestReport.evidenceConfidence.level,
        "",
        "Summary:",
        latestReport.summary,
        "",
        "Evidence and reasoning:",
        ...latestReport.reasons.map((item) => "- " + item),
        "",
        "Recommended defensive actions:",
        ...latestReport.actions.map((item, index) => `${index + 1}. ${item}`),
        "",
        "Method: transparent heuristic based on available VirusTotal statistics.",
        "Caution: score is not a probability of compromise or a definitive safety verdict."
      ].join("\n");

      notes.value = notes.value.trim()
        ? notes.value.trim() + "\n\n" + report
        : report;

      $("assessmentNoteMessage").textContent =
        "Assessment added to the editor. Click Save note to MySQL to persist it.";
      notes.focus();
    });

    $("assessmentExport").addEventListener("click", () => {
      if (!latestReport) {
        $("assessmentNoteMessage").textContent =
          "Investigate a target before exporting a report.";
        return;
      }

      const blob = new Blob(
        [JSON.stringify(latestReport, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sentinelops-assessment-" +
        latestReport.target.replace(/[^a-zA-Z0-9.-]/g, "_") + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      $("assessmentNoteMessage").textContent = "JSON assessment report exported.";
    });

    return panel;
  }

  function updateAssessment() {
    const panel = createPanel();
    if (!panel || !$("vtContent") ||
        $("vtContent").style.display === "none") return;

    const readCount = (id) => {
      const text = $(id)?.textContent?.trim();
      if (!text || text === "—" || !Number.isFinite(Number(text))) return null;
      const value = Number(text);
      return Number.isInteger(value) && value >= 0 ? value : null;
    };

    const malicious = readCount("vtMalicious");
    const suspicious = readCount("vtSuspicious");
    const harmless = readCount("vtHarmless");
    const undetected = readCount("vtUndetected");

    if ([malicious, suspicious, harmless, undetected].some(v => v === null)) return;

    const reputationText = $("vtReputation")?.textContent?.trim();
    const reputation = reputationText && reputationText !== "Unavailable"
      ? Number(reputationText) : null;
    const validReputation = reputation !== null && Number.isFinite(reputation);

    const reasons = [];
    const actions = [];
    const total = malicious + suspicious + harmless + undetected;
    const covered = malicious + suspicious + harmless;
    const coverage = total > 0 ? Math.round((covered / total) * 100) : 0;

    // This is an explainable heuristic, not a calibrated probability.
    // Positive findings raise the score; clean/undetected results do not prove safety.
    let score = 0;
    score += Math.min(malicious, 10) * 7;
    score += Math.min(Math.max(malicious - 10, 0), 10) * 2;
    score += Math.min(suspicious, 10) * 3;
    score = Math.min(100, Math.round(score));

    if (validReputation && reputation < -50) score = Math.min(100, score + 15);
    else if (validReputation && reputation < 0) score = Math.min(100, score + 5);

    let risk;
    let className;
    let summary;

    if (total === 0) {
      risk = "Insufficient data";
      className = "status";
      score = null;
      summary = "No engine statistics are available to assess this indicator reliably.";
      reasons.push("The available analysis contains no detection statistics.");
      actions.push("Open the full VirusTotal report and check again later.");
    } else if (malicious >= 10 || score >= 80) {
      risk = "Critical";
      className = "status danger";
      summary = "The available evidence indicates a high level of concern and warrants urgent investigation.";
      reasons.push(`${malicious} engines reported the target as malicious.`);
      actions.push("Validate the target and affected assets immediately.");
      actions.push("Follow your incident-response process and consider containment if activity is confirmed.");
      actions.push("Preserve relevant endpoint, DNS, firewall and proxy logs.");
    } else if (malicious >= 3 || score >= 50) {
      risk = "High";
      className = "status danger";
      summary = "Multiple malicious detections or a high heuristic score indicate elevated concern.";
      reasons.push(`${malicious} malicious and ${suspicious} suspicious detections were reported.`);
      actions.push("Corroborate findings using independent threat-intelligence sources.");
      actions.push("Review network and endpoint logs for related activity.");
      actions.push("Escalate according to your incident-response procedures.");
    } else if (malicious > 0 || suspicious >= 3 || score >= 25) {
      risk = "Medium";
      className = "status caution";
      summary = "The available evidence warrants additional investigation.";
      reasons.push(`${malicious} malicious and ${suspicious} suspicious detections were reported.`);
      actions.push("Review the underlying detections and their age.");
      actions.push("Correlate with recent network and endpoint events.");
      actions.push("Escalate if independent evidence supports a threat.");
    } else if (suspicious > 0 || score > 0) {
      risk = "Low";
      className = "status caution";
      summary = "Limited suspicious evidence is present. Validate it before making a decision.";
      reasons.push(`${malicious} malicious and ${suspicious} suspicious detections were reported.`);
      actions.push("Review the reporting engine and its detection context.");
      actions.push("Corroborate the finding with another trusted source.");
    } else {
      risk = "Informational";
      className = "status safe";
      summary = "No malicious or suspicious detections were reported in the available statistics. This does not prove the target is safe.";
      reasons.push("No malicious or suspicious detections were reported.");
      reasons.push(`${harmless} harmless and ${undetected} undetected results were reported.`);
      actions.push("Check the report date and the target's context.");
      actions.push("Correlate the indicator with your own security telemetry.");
      actions.push("Reassess if new evidence or suspicious activity appears.");
    }

    if (validReputation && reputation < -50) {
      reasons.push(`The reputation score is strongly negative (${reputation}).`);
    } else if (validReputation && reputation < 0) {
      reasons.push(`The reputation score is negative (${reputation}).`);
    }

    if (total > 0 && harmless + undetected > 0 &&
        malicious === 0 && suspicious === 0) {
      reasons.push("Harmless and undetected classifications are not proof of safety.");
    }

    const confidenceLevel = total === 0 ? "Unavailable"
      : total < 10 ? "Limited coverage"
      : total < 30 ? "Moderate coverage"
      : "Broader coverage";

    const confidenceDetail = total === 0
      ? "No engine results available."
      : `${total} total engine results; coverage is not verdict accuracy.`;

    const target = $("noteTarget")?.value ||
      ($("vtSubtitle")?.textContent || "").replace(/^Latest available analysis for /, "");

    latestReport = {
      generatedAt: new Date().toISOString(),
      target,
      source: "VirusTotal",
      risk,
      score,
      scoreType: "Heuristic score, not probability",
      summary,
      dataCoverage: {
        totalEngineResults: total,
        reportedMalicious: malicious,
        reportedSuspicious: suspicious,
        reportedHarmless: harmless,
        undetected,
        percentage: coverage
      },
      evidenceConfidence: {
        level: confidenceLevel,
        description: confidenceDetail
      },
      reputation: validReputation ? reputation : null,
      reasons,
      actions,
      limitations: [
        "Rule-based heuristic, not a generative AI verdict.",
        "The score is not a probability of compromise.",
        "VirusTotal results may be incomplete or outdated.",
        "A low score does not establish that a target is safe."
      ]
    };

    $("assessmentRisk").textContent = risk;
    $("assessmentRisk").className = className;
    $("assessmentTarget").textContent = `Target: ${target}`;
    $("assessmentScore").textContent = score === null ? "N/A" : `${score} / 100`;

    const meter = $("assessmentMeter");
    meter.style.width = `${score === null ? 0 : score}%`;
    meter.style.background = score === null ? "#64748b"
      : score >= 80 ? "#f87171"
      : score >= 50 ? "#fb923c"
      : score >= 25 ? "#fbbf24"
      : "#34d399";
    meter.setAttribute("aria-valuenow", String(score === null ? 0 : score));

    $("assessmentScoreNote").textContent = score === null
      ? "Insufficient engine statistics to calculate a score."
      : "Heuristic score derived from reported detections and reputation; not a probability of compromise.";

    $("assessmentCoverage").textContent = total === 0 ? "Unavailable" : `${coverage}%`;
    $("assessmentCoverageDetail").textContent =
      `${covered} classified results of ${total} total results; ${undetected} undetected.`;
    $("assessmentConfidence").textContent = confidenceLevel;
    $("assessmentConfidenceDetail").textContent = confidenceDetail;
    $("assessmentSummary").textContent = summary;

    $("assessmentReasons").replaceChildren(
      ...reasons.map(text => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
      })
    );

    $("assessmentActions").replaceChildren(
      ...actions.map(text => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
      })
    );

    panel.style.display = "block";
  }

  function start() {
    createPanel();

    const vtContent = $("vtContent");
    if (vtContent) {
      new MutationObserver(updateAssessment).observe(vtContent, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
    }

    $("lookupForm")?.addEventListener("submit", () => {
      if ($("assessmentPanel")) $("assessmentPanel").style.display = "none";
      latestReport = null;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

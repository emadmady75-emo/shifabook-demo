"use client";

import React, { useState } from "react";

type Step = "budget" | "timeline" | "scope" | "result";

export default function LeadIntakeDemo() {
  const [step, setStep] = useState<Step>("budget");
  const [budget, setBudget] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("");
  const [scope, setScope] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [tier, setTier] = useState<string>("B-Tier");
  const [feedback, setFeedback] = useState<string>("");

  const calculateScore = () => {
    let baseScore = 30;

    // Budget Scoring
    if (budget === "$50k+") baseScore += 40;
    else if (budget === "$15k-$50k") baseScore += 30;
    else if (budget === "$5k-$15k") baseScore += 15;
    else baseScore -= 10; // <$5k

    // Timeline Scoring
    if (timeline === "Immediate") baseScore += 15;
    else if (timeline === "1-3 Months") baseScore += 20;
    else baseScore += 10; // 3+ Months

    // Scope keyword matching (AI-style simulation)
    const normalizedScope = scope.toLowerCase();
    if (normalizedScope.includes("ai") || normalizedScope.includes("saas") || normalizedScope.includes("platform")) {
      baseScore += 10;
    }
    if (normalizedScope.includes("urgently") || normalizedScope.includes("budget") || normalizedScope.includes("funding")) {
      baseScore += 5;
    }
    if (normalizedScope.includes("cheap") || normalizedScope.includes("fix bug") || normalizedScope.includes("simple")) {
      baseScore -= 15;
    }

    // Clamp score
    const finalScore = Math.max(10, Math.min(100, baseScore));
    setScore(finalScore);

    // Determine Tier and Automation Action
    if (finalScore >= 85) {
      setTier("S-Tier (Premium Lead)");
      setFeedback("Automated Response: Send Calendly premium booking VIP link + auto-generate Next.js proposal draft.");
    } else if (finalScore >= 60) {
      setTier("A-Tier (Highly Qualified)");
      setFeedback("Automated Response: Direct to standard scheduler + flag in ClientSignal dashboard.");
    } else {
      setTier("C-Tier (Low Budget / Low Priority)");
      setFeedback("Automated Response: Politely auto-decline and refer client to standard template marketplace resource.");
    }

    setStep("result");
  };

  const resetDemo = () => {
    setBudget("");
    setTimeline("");
    setScope("");
    setScore(0);
    setStep("budget");
  };

  return (
    <div id="lead-demo-card" className="w-full max-w-xl mx-auto border border-gray-800 bg-[#0b0b0e]/80 rounded-2xl p-8 backdrop-blur-md relative shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Interactive Core Demo</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">Client-Side Intake Sandbox</span>
      </div>

      {step === "budget" && (
        <div className="animate-fadeIn">
          <h3 className="text-xl font-bold text-white mb-2">Step 1: What is the prospect's estimated budget?</h3>
          <p className="text-gray-400 text-sm mb-6">ClientSignal uses budgets to filter out tire-kickers instantly.</p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "<$5k", label: "Under $5k", desc: "Small / Simple Work" },
              { id: "$5k-$15k", label: "$5,000 - $15,000", desc: "MVP / Landing page" },
              { id: "$15k-$50k", label: "$15,000 - $50,000", desc: "Custom Platform" },
              { id: "$50k+", label: "$50,000+", desc: "Enterprise Solution" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setBudget(opt.id);
                  setStep("timeline");
                }}
                className="p-5 rounded-xl border border-gray-800 bg-[#121217] hover:border-indigo-500 hover:bg-[#16161f] transition-all text-left group"
              >
                <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "timeline" && (
        <div className="animate-fadeIn">
          <button onClick={() => setStep("budget")} className="text-xs text-gray-500 hover:text-white mb-4 transition-colors">
            ← Back to Budget
          </button>
          <h3 className="text-xl font-bold text-white mb-2">Step 2: What is the timeline?</h3>
          <p className="text-gray-400 text-sm mb-6">Determine urgency to gauge lead health.</p>

          <div className="space-y-3">
            {[
              { id: "Immediate", label: "Immediate (< 2 weeks)", desc: "Requires instant developer allocation" },
              { id: "1-3 Months", label: "1 to 3 Months", desc: "Standard planning cycle" },
              { id: "3+ Months", label: "Flexible (3+ Months)", desc: "Exploratory / Budget alignment" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setTimeline(opt.id);
                  setStep("scope");
                }}
                className="w-full p-4 rounded-xl border border-gray-800 bg-[#121217] hover:border-indigo-500 hover:bg-[#16161f] transition-all text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
                <span className="text-gray-600">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "scope" && (
        <div className="animate-fadeIn">
          <button onClick={() => setStep("timeline")} className="text-xs text-gray-500 hover:text-white mb-4 transition-colors">
            ← Back to Timeline
          </button>
          <h3 className="text-xl font-bold text-white mb-2">Step 3: What are they building?</h3>
          <p className="text-gray-400 text-sm mb-6">Our mock NLP algorithm parses keywords dynamically to adjust qualification scores.</p>

          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={4}
            placeholder="e.g. We need a SaaS platform with AI integrations. We have immediate funding and want it built quickly..."
            className="w-full bg-[#121217] border border-gray-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 transition-all mb-4"
          />

          <div className="text-xs text-gray-500 mb-6 flex flex-wrap gap-2">
            <span>💡 Try keywords for higher score:</span>
            <span className="text-indigo-400 font-mono">"AI"</span>
            <span className="text-indigo-400 font-mono">"SaaS"</span>
            <span className="text-indigo-400 font-mono">"Platform"</span>
          </div>

          <button
            onClick={calculateScore}
            disabled={!scope.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all focus:outline-none"
          >
            Generate Lead Score & Qualification
          </button>
        </div>
      )}

      {step === "result" && (
        <div className="animate-fadeIn text-center">
          <h3 className="text-2xl font-bold text-white mb-6">Lead Intake Results</h3>

          <div className="max-w-md mx-auto bg-gray-900/40 border border-gray-800/80 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400 font-medium">Auto-Calculated Score</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {tier}
              </span>
            </div>

            {/* Simulated circular/linear loading score bar */}
            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-4">
              <div 
                className={`h-full transition-all duration-1000 ${
                  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-indigo-500" : "bg-rose-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            <div className="flex justify-between items-baseline mb-6">
              <span className="text-sm text-gray-500">Intake Confidence Rating</span>
              <span className="text-4xl font-extrabold text-white">{score} <span className="text-lg text-gray-500 font-normal">/ 100</span></span>
            </div>

            <div className="border-t border-gray-800 pt-4 text-left">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Automated Workflow Trigger</span>
              <p className="text-sm text-gray-300 bg-[#0d0d12] border border-gray-800 p-3 rounded-lg font-mono">
                {feedback}
              </p>
            </div>
          </div>

          <div className="flex space-x-3 max-w-xs mx-auto">
            <button
              onClick={resetDemo}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg text-xs transition-colors"
            >
              🔄 Reset Demo
            </button>
            <a
              href="#waitlist-card"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center"
            >
              Join Waitlist
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";

export default function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [waitlistNumber, setWaitlistNumber] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setStatus("error");
      setErrorMsg("Please fill in your name and email.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    try {
      if (webhookUrl) {
        // Send data directly to n8n webhook
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            company,
            submittedAt: new Date().toISOString(),
            source: "ClientSignal Landing Page Waitlist",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to submit to webhook. Server responded with error.");
        }
      } else {
        // Simulate a sleek network delay for local mock flow
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Generate a mock waitlist spot (e.g. between 180 and 450)
      const mockSpot = Math.floor(Math.random() * 270) + 180;
      setWaitlistNumber(mockSpot);
      setStatus("success");
    } catch (err: any) {
      console.error("Waitlist submission error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div id="waitlist-card" className="w-full max-w-md mx-auto p-8 rounded-2xl border border-gray-800 bg-[#0c0c10]/90 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
      {/* Absolute ambient lights */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700" />

      {status === "success" ? (
        <div className="text-center py-6 animate-fadeIn">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
          <p className="text-gray-400 text-sm mb-6">
            Thanks for joining, <span className="text-white font-medium">{name}</span>. We'll send early beta invites shortly.
          </p>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-4">
            <span className="text-xs uppercase tracking-widest text-gray-500 block mb-1">Your Waitlist Spot</span>
            <span className="text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              #{waitlistNumber}
            </span>
          </div>

          <button
            onClick={() => {
              setName("");
              setEmail("");
              setCompany("");
              setStatus("idle");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            ← Sign up another email
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white tracking-tight">Join the Waitlist</h3>
            <p className="text-gray-400 text-sm mt-1">
              Secure priority access to ClientSignal. Be first to auto-qualify your leads.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="waitlist-name" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Full Name <span className="text-indigo-400">*</span>
              </label>
              <input
                id="waitlist-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Connor"
                className="w-full bg-[#14141a] border border-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={status === "loading"}
              />
            </div>

            <div>
              <label htmlFor="waitlist-email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Work Email <span className="text-indigo-400">*</span>
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@agency.com"
                className="w-full bg-[#14141a] border border-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={status === "loading"}
              />
            </div>

            <div>
              <label htmlFor="waitlist-company" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Agency or Business Name <span className="text-gray-600">(Optional)</span>
              </label>
              <input
                id="waitlist-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="TechCraft Studio"
                className="w-full bg-[#14141a] border border-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={status === "loading"}
              />
            </div>

            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3">
                {errorMsg}
              </div>
            )}

            <button
              id="waitlist-submit-btn"
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              {status === "loading" ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Securing Spot...</span>
                </>
              ) : (
                <span>Reserve My Spot</span>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-gray-500">
                🔒 Ready for Webhook & n8n workflow integration
              </span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

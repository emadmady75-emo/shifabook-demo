"use client";

import React, { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does the AI lead qualification work?",
    answer: "When a prospect visits your contact page, they complete a dynamic intake. ClientSignal uses natural language rules and pre-set threshold scoring to measure project scope, timeline feasibility, and budget sizes in real time. It outputs a lead rating between 1 and 100.",
  },
  {
    question: "Can I connect ClientSignal to my existing CRM?",
    answer: "Absolutely! ClientSignal is built to emit standard webhook structures. You can connect waitlist submissions or qualified leads directly to n8n, Make, Zapier, or custom backends by simply plugging in a webhook endpoint.",
  },
  {
    question: "What happens to under-qualified leads?",
    answer: "Instead of taking your personal time, ClientSignal politely redirects lower-tier leads to custom template resources, external marketplaces, or alternative low-cost agencies of your choice. You retain complete agency over references.",
  },
  {
    question: "Is there a custom brand dashboard?",
    answer: "Yes, once inside you can upload brand logos, customize your custom questionnaire styling, configure custom budget thresholds, and adjust lead-scoring weight models to fit your precise business demands.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="border border-gray-800 rounded-xl bg-[#09090c]/60 backdrop-blur-md overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full py-5 px-6 text-left flex items-center justify-between text-white font-medium hover:bg-gray-900/30 transition-colors"
            >
              <span>{faq.question}</span>
              <span className={`text-indigo-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? "max-h-48 border-t border-gray-800/50 py-5 px-6" : "max-h-0"
              }`}
            >
              <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

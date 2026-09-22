"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Send, PlusCircle, ExternalLink, Sparkles, AlertCircle, CheckCircle2, Calendar, User, ShieldAlert, Clock, ArrowRight } from "lucide-react";

interface TicketData {
  id: number;
  title: string;
  description: string;
  assignee_id: number | null;
  assignee_name?: string;
  due_date: string | null;
  priority: string;
  status: string;
  tags?: string[];
  language?: string;
  created_at: string;
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  ticket?: TicketData | null;
  missingFields?: string[];
  status?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [referenceDate, setReferenceDate] = useState("2026-09-19");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedId = localStorage.getItem("chat_session_id");
    if (savedId) {
      setSessionId(savedId);
      loadSession(savedId);
    } else {
      startNewSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/chat/sessions/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const loaded: ChatItem[] = data.messages.map((m: any) => ({
          id: String(m.id),
          role: m.role,
          content: m.content
        }));
        setMessages(loaded);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startNewSession() {
    const newId = "sess-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now();
    setSessionId(newId);
    localStorage.setItem("chat_session_id", newId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I am your AI Ticket Assistant. Type in any language to report an issue, mention who should fix it and when it's due, and I'll create a trackable ticket."
      }
    ]);
  }

  async function handleSend(customText?: string) {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userItem: ChatItem = {
      id: "usr-" + Date.now(),
      role: "user",
      content: textToSend.trim()
    };

    setMessages((prev) => [...prev, userItem]);
    if (!customText) setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          sessionId,
          referenceDate,
          timezone: "Asia/Kolkata"
        })
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();

      const assistantItem: ChatItem = {
        id: "ai-" + Date.now(),
        role: "assistant",
        content: data.reply,
        ticket: data.ticket,
        missingFields: data.missingFields,
        status: data.status
      };

      setMessages((prev) => [...prev, assistantItem]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Sorry, I ran into a connection problem. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "No deadline";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  }

  const samplePrompts = [
    "Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.",
    "Login page crashes on Safari, this will be resolved by the 4th.",
    "Payment page bahut slow chal raha hai, Amit isko 4 tarikh tak dekh lega.",
    "Search results are wrong, Rahul to fix by tomorrow."
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-white leading-tight">Chat-to-Ticket</h1>
            <p className="text-xs text-slate-400">Natural language to structured tickets</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ref Date:</span>
            <input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="bg-transparent border-none text-indigo-300 font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={startNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-200 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-md shadow-indigo-600/20 transition"
          >
            <span>Admin Panel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-4">
        {messages.length <= 1 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center my-4">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-200 mb-1">Quick Scenarios to Try</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Click any example to test immediate creation, multi-turn clarification, or Hinglish multi-language support.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {samplePrompts.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(promptText)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-850 hover:border-indigo-500/50 text-xs text-slate-300 transition flex items-start justify-between group"
                >
                  <span className="line-clamp-2 pr-2">{promptText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((item) => (
          <div
            key={item.id}
            className={`flex flex-col ${item.role === "user" ? "items-end" : "items-start"} space-y-2`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                item.role === "user"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 rounded-br-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 shadow-sm rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{item.content}</div>
            </div>

            {item.missingFields && item.missingFields.length > 0 && item.status === "needs_clarification" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Waiting for: {item.missingFields.join(", ")}</span>
                <button
                  onClick={() => handleSend("forget it")}
                  className="ml-2 text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Cancel draft
                </button>
              </div>
            )}

            {item.ticket && (
              <div className="max-w-[85%] sm:max-w-[75%] w-full bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl shadow-emerald-500/5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-xs tracking-wider uppercase text-emerald-400">
                      Ticket #{item.ticket.id} Created
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                    {item.ticket.status}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 text-base mb-2">{item.ticket.title}</h3>
                {item.ticket.description && item.ticket.description !== item.ticket.title && (
                  <p className="text-xs text-slate-400 mb-3">{item.ticket.description}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-slate-400 text-[10px] block">Assignee</span>
                      <span className="font-medium text-slate-200 truncate">
                        {item.ticket.assignee_name || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-slate-400 text-[10px] block">Due Date</span>
                      <span className="font-medium text-slate-200 truncate">
                        {formatDate(item.ticket.due_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] block">Priority</span>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded font-semibold text-[11px] ${
                          item.ticket.priority === "High" || item.ticket.priority === "Urgent"
                            ? "text-rose-400"
                            : item.ticket.priority === "Medium"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      >
                        {item.ticket.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {item.ticket.tags && item.ticket.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.ticket.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Link
                    href={`/admin?ticketId=${item.ticket.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    <span>View in Admin Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 w-28">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-75" />
            <div className="w-2 h-2 rounded-full bg-indigo-300 animate-pulse delay-150" />
            <span className="text-xs text-slate-400 ml-1">Thinking</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/90 backdrop-blur p-4">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Report an issue (e.g. 'Login broken on Safari, Rahul will fix it by the 4th')..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium flex items-center justify-center transition shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
            <span>Supports Hinglish, Hindi, Spanish, Chinese, Arabic, and any other language.</span>
            <span className="font-mono">Session: {sessionId.slice(0, 12)}...</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

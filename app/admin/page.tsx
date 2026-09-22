"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  User,
  Users,
  Shield,
  ArrowLeft,
  Calendar,
  Tag,
  MessageSquare,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  Plus,
  X
} from "lucide-react";

interface TicketItem {
  id: number;
  title: string;
  description: string;
  assignee_id: number | null;
  assignee_name?: string;
  assignee_department?: string;
  assignee_email?: string;
  due_date: string | null;
  priority: string;
  status: string;
  tags?: string[];
  language?: string;
  source_message_id?: number | null;
  source_message_content?: string;
  source_message_language?: string;
  source_session_id?: string;
  created_at: string;
  updated_at: string;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string | null;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [email, setEmail] = useState("admin@chattoticket.com");
  const [password, setPassword] = useState("admin123");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("Engineering");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userModalMessage, setUserModalMessage] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    const savedUser = localStorage.getItem("admin_user");
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchTickets();
      fetchUsers();
    }
  }, [token, statusFilter, assigneeFilter, priorityFilter]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (assigneeFilter !== "all") params.append("assignee", assigneeFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTicketStatus(ticketId: number, nextStatus: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) return;
      const updated = await res.json();

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: updated.status } : t))
      );

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTicketFields(ticketId: number, fields: Partial<TicketItem>) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields)
      });
      if (!res.ok) return;
      const updated = await res.json();

      fetchTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        fetchTicketDetail(ticketId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTicket(ticketId: number) {
    if (!confirm(`Are you sure you want to delete ticket #${ticketId}?`)) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
      if (!res.ok) return;
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTicketDetail(ticketId: number) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedTicket(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setCreatingUser(true);
    setUserModalMessage("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          department: newUserDepartment.trim(),
          role: "member"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add user");
      }

      setUsersList((prev) => [...prev, data]);
      setNewUserName("");
      setNewUserEmail("");
      setUserModalMessage("User added successfully!");
      setTimeout(() => setUserModalMessage(""), 3000);
    } catch (err: any) {
      setUserModalMessage(err.message || "Failed to add user");
    } finally {
      setCreatingUser(false);
    }
  }

  function formatDate(str: string | null) {
    if (!str) return "None";
    try {
      const d = new Date(str);
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return str;
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Login</h1>
                <p className="text-xs text-slate-400">Sign in to manage tickets</p>
              </div>
            </div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Chat</span>
            </Link>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              {loginLoading ? "Signing in..." : "Sign In to Admin"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">Default demo credentials:</p>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 flex items-center justify-between">
              <span>admin@chattoticket.com / admin123</span>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@chattoticket.com");
                  setPassword("admin123");
                }}
                className="text-indigo-400 hover:text-indigo-300 text-[11px] underline ml-2 cursor-pointer"
              >
                Autofill
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Chat UI</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base text-white">Ticket Admin Panel</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUsersModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Assignable Users ({usersList.length})</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pl-2">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentUser?.name || "Admin"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 text-xs transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Total Tickets</span>
            <span className="text-2xl font-bold text-white">{tickets.length}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Open</span>
            <span className="text-2xl font-bold text-blue-400">{openCount}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">In Progress</span>
            <span className="text-2xl font-bold text-amber-400">{inProgressCount}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Resolved</span>
            <span className="text-2xl font-bold text-emerald-400">{resolvedCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
              placeholder="Search title or description..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Assignees</option>
              {usersList.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} {u.department ? `(${u.department})` : ""}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            <button
              onClick={fetchTickets}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading tickets...
                    </td>
                  </tr>
                )}

                {!loading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No tickets match the selected criteria.
                    </td>
                  </tr>
                )}

                {!loading &&
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-850/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-indigo-400">
                        #{t.id}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-100 truncate">{t.title}</div>
                        {t.language && t.language !== "en" && (
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Lang: {t.language}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {t.assignee_name ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-200">{t.assignee_name}</span>
                            {t.assignee_department && (
                              <span className="text-[10px] text-slate-500">
                                ({t.assignee_department})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        {formatDate(t.due_date)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            t.priority === "High" || t.priority === "Urgent"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : t.priority === "Medium"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={t.status}
                          onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                          className={`bg-slate-950 border rounded-lg px-2 py-1 text-xs font-medium cursor-pointer ${
                            t.status === "Resolved"
                              ? "border-emerald-500/30 text-emerald-400"
                              : t.status === "In Progress"
                              ? "border-amber-500/30 text-amber-400"
                              : "border-slate-700 text-slate-300"
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatDate(t.created_at)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-1">
                        <button
                          onClick={() => fetchTicketDetail(t.id)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => deleteTicket(t.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs text-indigo-400">Ticket #{selectedTicket.id}</span>
                <h2 className="text-lg font-bold text-white mt-1">{selectedTicket.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Issue Description</label>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-200 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Status</label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateTicketFields(selectedTicket.id, { status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Assignee</label>
                  <select
                    value={selectedTicket.assignee_id ? String(selectedTicket.assignee_id) : ""}
                    onChange={(e) =>
                      updateTicketFields(selectedTicket.id, {
                        assignee_id: e.target.value ? parseInt(e.target.value, 10) : null
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name} {u.department ? `(${u.department})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Priority</label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => updateTicketFields(selectedTicket.id, { priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Due Date</label>
                <input
                  type="date"
                  value={selectedTicket.due_date ? selectedTicket.due_date.slice(0, 10) : ""}
                  onChange={(e) =>
                    updateTicketFields(selectedTicket.id, { due_date: e.target.value || null })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTicket.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="font-semibold text-indigo-400 block">Creation & Chat Source</span>
                {selectedTicket.source_message_content ? (
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Original Chat Message:</span>
                    <p className="text-slate-200 italic">&ldquo;{selectedTicket.source_message_content}&rdquo;</p>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Created via seed or admin</p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div>Detected Language: <span className="text-slate-200">{selectedTicket.language || "en"}</span></div>
                  <div>Source Message ID: <span className="text-slate-200">{selectedTicket.source_message_id || "None"}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showUsersModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Manage Assignable Users</h2>
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalMessage && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                {userModalMessage}
              </div>
            )}

            <form onSubmit={handleAddUser} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200">Add New Team Member</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="vikram@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Department</label>
                <input
                  type="text"
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  placeholder="e.g. Backend, Frontend, DevOps, QA"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creatingUser ? "Adding..." : "Add User"}</span>
                </button>
              </div>
            </form>

            <div>
              <h3 className="text-xs font-semibold text-slate-200 mb-2">Existing Users ({usersList.length})</h3>
              <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
                {usersList.map((u) => (
                  <div key={u.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-slate-100 block">{u.name}</span>
                      <span className="text-slate-400 text-[11px]">{u.email}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                        {u.department || "No Department"}
                      </span>
                      <span className="text-slate-500 text-[10px] block mt-0.5 uppercase">{u.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

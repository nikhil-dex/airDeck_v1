"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Header/navbar";
import AuroraBackground from "@/components/AuroraBackground";
import SlideFrame from "@/components/SlideFrame";
import { Presentation, ExternalLink, Link as LinkIcon, Plus, Download, FileCode, Trash2, MoreVertical, Pencil, Check, X, UserPlus, Users, Code, Copy } from "lucide-react";
import { downloadAsPptx, downloadHtmlFile, deckHasDynamicContent, PPTX_EXPORT_WARNING } from "@/lib/exporters";

export default function PresentationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [ppts, setPpts] = useState([]);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [busyKey, setBusyKey] = useState(""); // `${deckId}:ppt|html|delete` while an action runs
  const [menuOpenId, setMenuOpenId] = useState("");
  const [renamingId, setRenamingId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [sharingId, setSharingId] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState(""); // success text for the sharing card
  const [shareList, setShareList] = useState(null); // emails the open share panel's deck is shared with

  useEffect(() => {
    if (session === null) {
      router.push('/signin');
    } else if (session !== undefined) {
      fetch("/api/ppt_History")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setPpts(data.result || []);
          }
        })
        .catch(() => setError("Failed to load your presentations."))
        .finally(() => setIsLoading(false));
    }
  }, [session, router]);

  const handleDownload = async (ppt, kind) => {
    if (busyKey) return; // one download at a time — PPT capture is heavy
    setBusyKey(`${ppt.id}:${kind}`);
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}`);
      const data = await res.json();
      if (!res.ok || data.error || !Array.isArray(data.slides) || data.slides.length === 0) {
        throw new Error(data.error || "This deck has no slides to download.");
      }

      if (kind === "html") {
        downloadHtmlFile(ppt.title, data.slides);
      } else {
        if (deckHasDynamicContent(data.slides) && !window.confirm(PPTX_EXPORT_WARNING)) {
          return;
        }
        await downloadAsPptx(ppt.title, data.slides);
      }
    } catch (err) {
      setError(err.message || "Download failed.");
    } finally {
      setBusyKey("");
    }
  };

  const handleDelete = async (ppt) => {
    if (busyKey) return;
    if (!window.confirm(`Delete "${ppt.title}"? The share link will stop working. This cannot be undone.`)) {
      return;
    }

    setBusyKey(`${ppt.id}:delete`);
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete.");
      }
      setPpts((prev) => prev.filter((p) => p.id !== ppt.id));
    } catch (err) {
      setError(err.message || "Failed to delete.");
    } finally {
      setBusyKey("");
    }
  };

  // Load a saved deck back into the code editor. The editor and export page
  // exchange slides via localStorage; pptEditingId makes saving update this
  // deck instead of creating a new one.
  const startEdit = async (ppt) => {
    if (busyKey) return;
    setBusyKey(`${ppt.id}:edit`);
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}`);
      const data = await res.json();
      if (!res.ok || data.error || !Array.isArray(data.slides) || data.slides.length === 0) {
        throw new Error(data.error || "This deck has no slides to edit.");
      }

      localStorage.setItem("pptPages", JSON.stringify(data.slides));
      localStorage.setItem("pptEditingId", ppt.id);
      localStorage.setItem("pptEditingTitle", ppt.title || "");
      router.push("/code-ide");
    } catch (err) {
      setError(err.message || "Failed to open deck.");
      setBusyKey("");
    }
  };

  // Copy a deck into the user's own account — recipients get an editable
  // copy of a shared deck; owners can use any deck as a template.
  const duplicateDeck = async (ppt) => {
    if (busyKey) return;
    setBusyKey(`${ppt.id}:duplicate`);
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error || !data.deck) {
        throw new Error(data.error || "Failed to duplicate.");
      }
      setPpts((prev) => [data.deck, ...prev]);
    } catch (err) {
      setError(err.message || "Failed to duplicate.");
    } finally {
      setBusyKey("");
    }
  };

  const startRename = (ppt) => {
    setRenamingId(ppt.id);
    setRenameValue(ppt.title || "");
    setError("");
  };

  const cancelRename = () => {
    setRenamingId("");
    setRenameValue("");
  };

  const saveRename = async (ppt) => {
    const newTitle = renameValue.trim();
    if (!newTitle || newTitle === ppt.title) {
      cancelRename();
      return;
    }

    setBusyKey(`${ppt.id}:rename`);
    try {
      const res = await fetch(`/api/ppt/${ppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to rename.");
      }
      setPpts((prev) => prev.map((p) => (p.id === ppt.id ? { ...p, title: data.title } : p)));
      cancelRename();
    } catch (err) {
      setError(err.message || "Failed to rename.");
    } finally {
      setBusyKey("");
    }
  };

  const startShare = async (ppt) => {
    setSharingId(ppt.id);
    setShareEmail("");
    setShareMessage("");
    setShareList(null);
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}/share`);
      const data = await res.json();
      setShareList(Array.isArray(data.sharedWith) ? data.sharedWith : []);
    } catch {
      setShareList([]);
    }
  };

  const cancelShare = () => {
    setSharingId("");
    setShareEmail("");
    setShareMessage("");
    setShareList(null);
  };

  const submitShare = async (ppt) => {
    if (!shareEmail.trim()) return;

    setBusyKey(`${ppt.id}:share`);
    setShareMessage("");
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: shareEmail }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to share.");
      }
      setShareMessage(data.message);
      const added = shareEmail.trim().toLowerCase();
      setShareList((prev) => (prev && !prev.includes(added) ? [...prev, added] : prev));
      setShareEmail("");
    } catch (err) {
      setError(err.message || "Failed to share.");
    } finally {
      setBusyKey("");
    }
  };

  // Owner revokes one person's access from the share panel.
  const removeShare = async (ppt, email) => {
    setBusyKey(`${ppt.id}:share`);
    setShareMessage("");
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to stop sharing.");
      }
      setShareList((prev) => (prev ? prev.filter((e) => e !== email) : prev));
      setShareMessage(data.message);
    } catch (err) {
      setError(err.message || "Failed to stop sharing.");
    } finally {
      setBusyKey("");
    }
  };

  // Recipient removes a deck someone shared with them from their own list.
  const removeFromMyDecks = async (ppt) => {
    if (busyKey) return;
    if (!window.confirm(`Remove "${ppt.title}" from your decks? ${ppt.owner} can share it with you again later.`)) {
      return;
    }

    setBusyKey(`${ppt.id}:unshare`);
    setError("");

    try {
      const res = await fetch(`/api/ppt/${ppt.id}/share`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to remove.");
      }
      setPpts((prev) => prev.filter((p) => p.id !== ppt.id));
    } catch (err) {
      setError(err.message || "Failed to remove.");
    } finally {
      setBusyKey("");
    }
  };

  const copyLink = async (id) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/present/${id}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      // Clipboard unavailable — user can still open the deck and copy the URL.
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070709]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#5eadff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400 font-medium">Loading your decks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709]">
      <AuroraBackground />
      <div className="page-content">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-gradient">
            My Decks
          </h1>
          <Link
            href="/"
            className="btn-accent px-5 py-2.5 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Deck
          </Link>
        </div>

        {error && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-4 text-red-400 font-medium mb-6">
            {error}
          </div>
        )}

        {!error && ppts.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Presentation className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-xl font-semibold text-gray-200 mb-2">No saved decks yet</p>
            <p className="text-gray-500">
              Generate a presentation and hit &quot;Generate Link&quot; on the export page to save it here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {ppts.map((ppt) => (
            <div
              key={ppt.id}
              // The open menu's card must sit above its sibling cards: each
              // glass card is its own stacking context (backdrop-filter).
              className={`glass-card p-6 ${menuOpenId === ppt.id ? "z-40" : ""}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* First-slide thumbnail; clicking it presents the deck */}
              <a
                href={`/present/${ppt.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-full sm:w-44 rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-[#5eadff]/60 transition-all"
                title="Open presentation"
              >
                {ppt.thumb ? (
                  <div className="pointer-events-none">
                    <SlideFrame html={ppt.thumb} still className="w-full aspect-video" />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-white/5 flex items-center justify-center">
                    <Presentation className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </a>
              <div className="min-w-0 flex-1">
                {renamingId === ppt.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(ppt);
                        else if (e.key === "Escape") cancelRename();
                      }}
                      maxLength={120}
                      autoFocus
                      disabled={busyKey === `${ppt.id}:rename`}
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-[#5eadff]/60 rounded-lg text-lg font-semibold text-gray-100 focus:ring-1 focus:ring-[#5eadff]/50 outline-none"
                    />
                    <button
                      onClick={() => saveRename(ppt)}
                      disabled={busyKey === `${ppt.id}:rename`}
                      className="p-2 rounded-lg bg-[#b3ffc8]/20 hover:bg-[#b3ffc8]/30 disabled:opacity-40 text-[#b3ffc8] transition-colors"
                      title="Save (Enter)"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelRename}
                      disabled={busyKey === `${ppt.id}:rename`}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                      title="Cancel (Esc)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-100 truncate flex items-center gap-2">
                    {ppt.title}
                    {ppt.shared && (
                      <span className="text-xs font-medium bg-[#ff6ef7]/10 text-[#ff6ef7] border border-[#ff6ef7]/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3" /> Shared by {ppt.owner}
                      </span>
                    )}
                  </h2>
                )}
                <p className="text-sm text-gray-500">
                  {ppt.createdAt ? new Date(ppt.createdAt).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  }) : ""}
                  {copiedId === ppt.id && (
                    <span className="ml-2 text-[#b3ffc8] font-medium">Link copied!</span>
                  )}
                  {busyKey === `${ppt.id}:ppt` && (
                    <span className="ml-2 text-[#5eadff] font-medium">Preparing PPT...</span>
                  )}
                  {busyKey === `${ppt.id}:html` && (
                    <span className="ml-2 text-[#5eadff] font-medium">Preparing HTML...</span>
                  )}
                  {busyKey === `${ppt.id}:delete` && (
                    <span className="ml-2 text-red-600 font-medium">Deleting...</span>
                  )}
                  {busyKey === `${ppt.id}:unshare` && (
                    <span className="ml-2 text-red-600 font-medium">Removing...</span>
                  )}
                  {busyKey === `${ppt.id}:edit` && (
                    <span className="ml-2 text-[#5eadff] font-medium">Opening editor...</span>
                  )}
                  {busyKey === `${ppt.id}:duplicate` && (
                    <span className="ml-2 text-[#5eadff] font-medium">Duplicating...</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <a
                  href={`/present/${ppt.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> Present
                </a>

                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === ppt.id ? "" : ppt.id)}
                    disabled={Boolean(busyKey)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 transition-colors"
                    title="More actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {menuOpenId === ppt.id && (
                    <>
                      {/* Invisible backdrop: clicking anywhere else closes the menu */}
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId("")} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-[#101016] border border-white/10 rounded-xl shadow-2xl z-50 py-2">
                        {!ppt.shared && (
                          <>
                            <button
                              onClick={() => { setMenuOpenId(""); startEdit(ppt); }}
                              className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                            >
                              <Code className="w-4 h-4 text-gray-500" /> Edit deck
                            </button>
                            <button
                              onClick={() => { setMenuOpenId(""); startRename(ppt); }}
                              className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-gray-500" /> Rename
                            </button>
                            <button
                              onClick={() => { setMenuOpenId(""); startShare(ppt); }}
                              className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                            >
                              <UserPlus className="w-4 h-4 text-gray-500" /> Share with user
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setMenuOpenId(""); duplicateDeck(ppt); }}
                          className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                          {ppt.shared ? "Duplicate to My Decks" : "Duplicate deck"}
                        </button>
                        <button
                          onClick={() => { setMenuOpenId(""); copyLink(ppt.id); }}
                          className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                        >
                          <LinkIcon className="w-4 h-4 text-gray-500" /> Copy Link
                        </button>
                        <button
                          onClick={() => { setMenuOpenId(""); handleDownload(ppt, "ppt"); }}
                          className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                        >
                          <Download className="w-4 h-4 text-gray-500" /> Download as PPT
                        </button>
                        <button
                          onClick={() => { setMenuOpenId(""); handleDownload(ppt, "html"); }}
                          className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                        >
                          <FileCode className="w-4 h-4 text-gray-500" /> Download as HTML
                        </button>
                        <div className="my-2 border-t border-white/10" />
                        {!ppt.shared ? (
                          <button
                            onClick={() => { setMenuOpenId(""); handleDelete(ppt); }}
                            className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-400/10 flex items-center gap-3 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        ) : (
                          <button
                            onClick={() => { setMenuOpenId(""); removeFromMyDecks(ppt); }}
                            className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-400/10 flex items-center gap-3 transition-colors"
                          >
                            <X className="w-4 h-4" /> Remove from My Decks
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              </div>

              {sharingId === ppt.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitShare(ppt); else if (e.key === "Escape") cancelShare(); }}
                      placeholder="teammate@example.com"
                      autoFocus
                      disabled={busyKey === `${ppt.id}:share`}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:ring-1 focus:ring-[#5eadff]/50 focus:border-[#5eadff] outline-none transition-all"
                    />
                    <button
                      onClick={() => submitShare(ppt)}
                      disabled={busyKey === `${ppt.id}:share` || !shareEmail.trim()}
                      className="btn-accent px-5 py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      {busyKey === `${ppt.id}:share` ? "Sharing..." : "Share"}
                    </button>
                    <button
                      onClick={cancelShare}
                      disabled={busyKey === `${ppt.id}:share`}
                      className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  {shareMessage && (
                    <p className="mt-2 text-sm text-[#b3ffc8] font-medium">{shareMessage}</p>
                  )}

                  {shareList === null ? (
                    <p className="mt-3 text-sm text-gray-400">Loading current shares...</p>
                  ) : shareList.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-400 mb-2">Currently shared with:</p>
                      <div className="flex flex-wrap gap-2">
                        {shareList.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1.5 bg-[#ff6ef7]/10 text-[#ff6ef7] border border-[#ff6ef7]/20 text-sm font-medium px-3 py-1.5 rounded-full"
                          >
                            {email}
                            <button
                              onClick={() => removeShare(ppt, email)}
                              disabled={busyKey === `${ppt.id}:share`}
                              className="hover:text-red-600 disabled:opacity-40 transition-colors"
                              title={`Stop sharing with ${email}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-400">Not shared with anyone yet.</p>
                  )}

                  <p className="mt-2 text-sm text-gray-400">
                    The deck will appear in their My Decks. They must already have a PPTgen account.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

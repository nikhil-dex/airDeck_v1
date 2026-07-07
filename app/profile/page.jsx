"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Navbar from "@/components/Header/navbar";
import { Coins, Mail, Calendar, AtSign, Pencil, Lock, Check, LogOut } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    if (session === null) {
      router.push('/signin');
    } else if (session !== undefined) {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setProfile(data);
            setNewUsername(data.username || "");
          }
        })
        .catch(() => setError("Failed to load profile."))
        .finally(() => setIsLoading(false));
    }
  }, [session, router]);

  const saveUsername = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setSaveError(data.error || "Failed to update username.");
        return;
      }

      setProfile((prev) => ({ ...prev, username: data.username, usernameChanged: true }));
      setSaveSuccess(data.message);
      setEditing(false);
    } catch {
      setSaveError("Failed to update username.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-black via-purple-900 to-fuchsia-600 bg-clip-text text-transparent">
          Profile
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 font-medium mb-6">
            {error}
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Identity card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex items-center gap-6">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt="Profile picture"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-100"
                  unoptimized={true}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-blue-100">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 truncate">{profile.name}</h2>
                <p className="text-gray-500 flex items-center gap-1.5 mt-1">
                  <Mail className="w-4 h-4" /> {profile.email}
                </p>
                {profile.createdAt && (
                  <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Credits card */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl shadow-xl p-8 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <Coins className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Remaining Credits</p>
                  <p className="text-sm text-gray-500">Each generation uses 1 credit</p>
                </div>
              </div>
              <span className="text-5xl font-extrabold text-amber-500">{profile.credit}</span>
            </div>

            {/* Username card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AtSign className="w-5 h-5 text-blue-600" /> Username
                </h3>
                {profile.usernameChanged ? (
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Lock className="w-4 h-4" /> Change used
                  </span>
                ) : !editing && (
                  <button
                    onClick={() => { setEditing(true); setSaveError(""); setSaveSuccess(""); }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>

              {editing && !profile.usernameChanged ? (
                <div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      maxLength={20}
                      placeholder="your-new-username"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      disabled={saving}
                    />
                    <button
                      onClick={saveUsername}
                      disabled={saving || !newUsername.trim()}
                      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setNewUsername(profile.username || ""); setSaveError(""); }}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-amber-600 font-medium">
                    ⚠️ You can only change your username once — choose carefully.
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    3-20 characters: letters, numbers, dots, dashes or underscores.
                  </p>
                </div>
              ) : (
                <p className="text-xl font-mono text-gray-700 break-all">{profile.username}</p>
              )}

              {saveError && (
                <p className="mt-3 text-sm text-red-600 font-medium">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="mt-3 text-sm text-green-600 font-medium">{saveSuccess}</p>
              )}
            </div>

            {/* Account actions */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
              <button
                onClick={() => signOut({ callbackUrl: "/signin" })}
                className="px-6 py-3 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-semibold transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

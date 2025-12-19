// src/pages/UpdatePassword.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseService";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [status, setStatus] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = (useNavigate && useNavigate()) as any;

  useEffect(() => {
    // Try to exchange the URL for a session (Supabase JS helper)
    // This must run on the page the email redirect points to.
    (async () => {
      try {
        // getSessionFromUrl reads the hash/query the link includes and sets local session
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });

        // If error exists but it's only that there's no session, it may be OK.
        if (error) {
          // Not fatal: many setups may not return a session from the link.
          // We'll still let the user try to update if they are already signed in.
          console.debug("getSessionFromUrl returned error:", error);
        } else {
          console.debug("getSessionFromUrl success:", data);
        }

        // If a valid session was established, user is signed in client-side.
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session?.user) {
          setStatus("Ready to set a new password.");
        } else {
          // No session -> user must sign in first or we must handle server-side token -> inform user
          setStatus("Follow the link to set a new password. If this page doesn't allow it, sign in with your account and try 'forgot password' again.");
        }
      } catch (err: any) {
        console.error("Error getting session from URL:", err);
        setStatus("Error initializing reset. Try signing in and requesting another reset link.");
      }
    })();
  }, []);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setStatus(null);
      // Must be an authenticated session to call updateUser()
      const { data: current } = await supabase.auth.getSession();
      const user = current?.session?.user;
      if (!user) {
        setStatus("You are not signed in. Please sign in and try again, or request another reset link.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatus("Password updated successfully. Redirecting to sign in...");
      // optional: sign out so they re-login
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) { /* ignore */ }
        navigate?.("/") || window.location.replace("/");
      }, 1500);
    } catch (err: any) {
      console.error("update password error:", err);
      setStatus("Could not update password: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 p-6 rounded">
        <h2 className="text-xl font-semibold text-white mb-3">Set a new password</h2>
        {status && <p className="text-sm text-slate-300 mb-3">{status}</p>}
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-slate-800 text-white mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={loading || !password}
            className="px-4 py-2 bg-emerald-500 rounded text-white disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
          <button onClick={() => navigate?.("/") || window.location.replace("/")} className="px-4 py-2 bg-slate-700 rounded text-white">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

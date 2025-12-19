import React, { useState } from "react";
import { supabase } from "../services/supabaseService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    try {
      setLoading(true);
      setStatus(null);
      // redirectTo must match your URL config in Supabase
      const redirectTo = `${window.location.origin}/update-password`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus("If that email exists, a reset link has been sent. Check your inbox.");
    } catch (err: any) {
      setStatus("Error sending reset email: " + (err.message ?? String(err)));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-slate-900 rounded-md max-w-md">
      <h3 className="text-lg font-semibold text-white mb-2">Reset password</h3>
      <p className="text-sm text-slate-400 mb-3">Enter your email and we'll send a reset link.</p>
      <input
        className="w-full p-2 rounded bg-slate-800 text-white mb-3"
        value={email}
        placeholder="you@example.com"
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={handleSend} disabled={loading} className="px-4 py-2 bg-indigo-600 rounded text-white">
          {loading ? "Sending..." : "Send reset email"}
        </button>
      </div>
      {status && <p className="mt-3 text-sm text-slate-300">{status}</p>}
    </div>
  );
}

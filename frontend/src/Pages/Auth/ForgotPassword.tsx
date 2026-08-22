import React, { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        toast.error("Request failed. Try again.");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot Password?</h1>
          <p className="text-sm text-muted-foreground">
            Enter your account email to receive a password reset link
          </p>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-sm">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-foreground font-semibold">Reset Link Sent!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account with <strong className="text-foreground">{email}</strong> exists, you will receive an email with reset instructions shortly.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@usindh.edu.pk"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="pt-4 border-t border-border/70 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

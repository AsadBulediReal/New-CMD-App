import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import GoogleLoginButton from "../../components/Auth/GoogleLoginButton";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; status?: string; reason?: string } | null>(null);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password");
      return;
    }

    setLoading(true);
    setErrorInfo(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } else {
      if (res.status === "pending") {
        setErrorInfo({
          message: res.error || "Your account is awaiting administrator approval.",
          status: "pending",
        });
      } else if (res.status === "rejected") {
        setErrorInfo({
          message: "Registration Rejected by Administrator",
          status: "rejected",
          reason: res.rejectionReason || "No specific reason provided.",
        });
      } else {
        setErrorInfo({
          message: res.error || "Invalid email or password",
        });
      }
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setErrorInfo(null);
    const res = await loginWithGoogle(credential);
    if (res.success) {
      if (res.status === "active") {
        toast.success("Welcome back!");
        navigate(from, { replace: true });
      } else {
        setErrorInfo({
          message: res.message || "Your account is pending administrator approval.",
          status: "pending",
        });
      }
    } else {
      if (res.status === "pending") {
        setErrorInfo({
          message: res.error || "Your account is awaiting administrator approval.",
          status: "pending",
        });
      } else if (res.status === "rejected") {
        setErrorInfo({
          message: "Registration Rejected by Administrator",
          status: "rejected",
          reason: res.rejectionReason || "No specific reason provided.",
        });
      } else {
        setErrorInfo({
          message: res.error || "Google sign-in failed",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card border border-border p-1 mb-2 shadow-xs">
            <img src="/favicon.svg" alt="University of Sindh Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CMD Finance Portal</h1>
          <p className="text-sm text-muted-foreground">Finance Wing · University of Sindh, Jamshoro</p>
        </div>

        {/* Status Alerts */}
        {errorInfo && (
          <div
            className={`p-4 rounded-xl border text-sm transition-all ${
              errorInfo.status === "rejected"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : errorInfo.status === "pending"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <div className="flex items-start gap-3">
              {errorInfo.status === "rejected" ? (
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{errorInfo.message}</p>
                {errorInfo.reason && (
                  <div className="mt-2 p-2.5 rounded-lg bg-background/80 border border-destructive/20 text-xs text-foreground">
                    <span className="font-medium text-destructive">Rejection Reason: </span>
                    {errorInfo.reason}
                  </div>
                )}
                {errorInfo.status === "pending" && (
                  <p className="text-xs opacity-90">
                    Your account has been registered and is in the admin verification queue. You will receive an email once approved.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Login Container */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          {/* Google Sign-in */}
          <GoogleLoginButton
            text="signin_with"
            onSuccess={handleGoogleSuccess}
            onError={(err) => setErrorInfo({ message: err })}
          />

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="flex-1 border-t border-border" />
            <span className="shrink-0 px-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">
              Or continue with
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border/70 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Create new account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

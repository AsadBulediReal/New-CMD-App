import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, Mail, Lock, User, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import GoogleLoginButton from "../../components/Auth/GoogleLoginButton";

export const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"pending" | "active" | null>(null);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await register(name, email, password);
    setLoading(false);

    if (res.success) {
      if (res.status === "active") {
        toast.success("Administrator account initialized!");
        navigate("/", { replace: true });
      } else {
        setSubmittedStatus("pending");
      }
    } else {
      toast.error(res.error || "Registration failed");
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    const res = await loginWithGoogle(credential);
    setLoading(false);

    if (res.success) {
      if (res.status === "active") {
        toast.success("Administrator account initialized!");
        navigate("/", { replace: true });
      } else {
        setSubmittedStatus("pending");
      }
    } else {
      if (res.status === "pending") {
        setSubmittedStatus("pending");
      } else {
        toast.error(res.error || "Google registration failed");
      }
    }
  };

  if (submittedStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Registration Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Thank you for registering{name ? `, ${name}` : ""}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left text-xs text-amber-700 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Pending Administrator Approval</span>
            </div>
            <p className="opacity-90">
              Your account details have been forwarded to the Cash Management Division administrator for verification. You will receive an email notification as soon as your account is approved.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all text-center"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2 shadow-sm">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Account</h1>
          <p className="text-sm text-muted-foreground">Register for Cash Management Division Portal access</p>
        </div>

        {/* Registration Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          {/* Google Sign-up */}
          <GoogleLoginButton
            text="signup_with"
            onSuccess={handleGoogleSuccess}
            onError={(err) => toast.error(err)}
          />

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="flex-1 border-t border-border" />
            <span className="shrink-0 px-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">
              Or sign up with email
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
                  <span>Submitting Application...</span>
                </>
              ) : (
                <span>Submit for Approval</span>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border/70 text-center">
            <p className="text-xs text-muted-foreground">
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

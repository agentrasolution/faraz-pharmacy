import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Lock, Sun, Moon } from "lucide-react";
import { api } from "@/lib/api";
import logoSrc from "@/asset/image/logo.png";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("faraz_theme", next ? "dark" : "light");
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    const err = await login(username, password);
    if (err) setError(err);
    setLoading(false);
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setRecoveryError("");
    if (!recoveryPhrase || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setRecoveryError("Passwords do not match");
      return;
    }
    if (newPassword.length < 4) {
      setRecoveryError("Password must be at least 4 characters");
      return;
    }
    setRecovering(true);
    try {
      const res = await api.auth.recoverPassword(recoveryPhrase.trim(), newPassword);
      if (res.error) {
        setRecoveryError(res.error);
      } else {
        setRecoverySuccess(true);
        setTimeout(() => {
          setRecoveryOpen(false);
          setRecoverySuccess(false);
          setRecoveryPhrase("");
          setNewPassword("");
          setConfirmPassword("");
        }, 3000);
      }
    } catch {
      setRecoveryError("Recovery failed");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <button
        onClick={toggleDark}
        className="fixed top-4 right-4 h-9 w-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-200 z-20 bg-surface/80 border border-border/60 backdrop-blur-sm shadow-xs"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          <div className="rounded-3xl border border-border/80 bg-surface p-8 sm:p-10 shadow-xl shadow-brand/5">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#4A25E1] to-[#3612B8] flex items-center justify-center p-2 shadow-md shadow-brand/20">
                  <img src={logoSrc} alt="" className="h-full w-full object-contain filter brightness-0 invert" />
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold text-text-primary tracking-tight">
                    Faraz Pharmacy
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    v2.0 Enterprise Cloud
                  </span>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-text-primary tracking-tight">Welcome back</h2>
              <p className="text-xs text-text-secondary mt-1">Please enter your credentials to sign in</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-text-primary">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="rounded-xl h-10 bg-surface-2/60 border-border/80 focus:border-brand"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-text-primary">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10 rounded-xl h-10 bg-surface-2/60 border-border/80 focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3.5 py-2.5 text-center font-medium"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full h-10 rounded-xl bg-gradient-to-r from-[#4A25E1] to-[#3612B8] hover:from-[#3e1ed1] hover:to-[#2e0ea3] text-white shadow-md shadow-brand/20 font-medium transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in to Dashboard"
                )}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(true)}
                  className="text-xs text-text-secondary hover:text-brand transition-colors font-medium"
                >
                  Forgot password?
                </button>
                <span className="text-[11px] text-text-secondary/70">
                  Secured with SQLite & Electron
                </span>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-[#4A25E1] via-[#431DDB] to-[#3612B8] relative overflow-hidden p-12">
        {/* Ambient glow decorative blobs */}
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-[#754BFB]/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#3612B8]/40 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative z-10 text-center max-w-md"
        >
          <div className="w-28 h-28 p-5 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <img src={logoSrc} alt="Faraz Pharmacy" className="w-full h-full object-contain filter brightness-0 invert" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Airnow Modern SaaS Edition
          </div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            Faraz Pharmacy
          </h2>
          <p className="text-sm text-white/80 mt-3 leading-relaxed">
            High performance Point-of-Sale, real-time inventory tracking, and intelligent analytics designed for modern pharmacies.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-xs text-white/60">Search & POS</p>
              <p className="text-sm font-bold text-white mt-0.5">Ultra Fast</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-xs text-white/60">Shortcuts</p>
              <p className="text-sm font-bold text-white mt-0.5">F1 - F13</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-xs text-white/60">Backup</p>
              <p className="text-sm font-bold text-white mt-0.5">Auto Drive</p>
            </div>
          </div>
        </motion.div>
      </div>

      <Dialog
        open={recoveryOpen}
        onOpenChange={(v) => {
          if (!v) {
            setRecoveryOpen(false);
            setTimeout(() => {
              setRecoverySuccess(false);
              setRecoveryError("");
              setRecoveryPhrase("");
              setNewPassword("");
              setConfirmPassword("");
            }, 200);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recover Password</DialogTitle>
          </DialogHeader>
          {recoverySuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-5"
            >
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
                <Lock className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-success font-medium">Password reset successfully!</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                You can now sign in with your new password.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleRecoverySubmit} className="space-y-3">
              <p className="text-xs text-text-secondary">
                Enter your recovery key to reset your password.
              </p>
              <div className="space-y-1">
                <Label htmlFor="recovery-phrase" className="text-xs">
                  Recovery Key
                </Label>
                <Input
                  id="recovery-phrase"
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                  placeholder="Paste your recovery key"
                  className="font-mono text-xs"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password" className="text-xs">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password" className="text-xs">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              {recoveryError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-danger text-center"
                >
                  {recoveryError}
                </motion.p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={recovering || !recoveryPhrase || !newPassword || !confirmPassword}
              >
                {recovering ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

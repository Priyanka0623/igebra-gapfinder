// User authentication page with Register and Sign In tabs, validation, and hashed password storage
import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { authenticateUserAccount, registerUserAccount } from "../lib/storage";

interface LoginProps {
  onLoginSuccess: (email: string, name: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      if (tab === "register") {
        const res = await registerUserAccount(name, email, password);
        if (!res.ok) {
          setError(res.error);
          setIsSubmitting(false);
          return;
        }
        onLoginSuccess(res.account.email, res.account.name);
      } else {
        const res = await authenticateUserAccount(email, password);
        if (!res.ok) {
          setError(res.error);
          setIsSubmitting(false);
          return;
        }
        onLoginSuccess(res.account.email, res.account.name);
      }
    } catch {
      setError("Could not complete authentication. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] bg-white dark:bg-stone-950">
      <section className="gf-hero-card !rounded-none flex flex-col justify-between p-10 text-white lg:p-14">
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="gf-brand-mark !bg-[#c4ed88] !text-[#214b35]">g</span>
          <span className="font-display text-xl font-extrabold tracking-tight text-[#f8fbf4]">
            gapfinder
          </span>
        </div>

        <div className="relative z-10 my-12 max-w-md">
          <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#c6d9c4]">
            LEARN WITH DIRECTION
          </div>
          <h1 className="font-display mt-3.5 text-4xl font-bold tracking-tight sm:text-5xl leading-[1.08]">
            Small steps.
            <br />
            Big <span className="text-[#c1e98b]">aha</span> moments.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#d0ddd1]">
            Upload your syllabus, notes, and past papers. Find the gaps, focus your practice, and see how far you&apos;ve come.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 text-xs text-[#c9d7c8]">
          <span className="h-2 w-2 rounded-full bg-[#c4ee8a]" />
          <span>Your personal learning space · Local BM25 retrieval</span>
        </div>
      </section>

      <section className="flex items-center justify-center p-8 sm:p-12 bg-white dark:bg-stone-950">
        <div className="w-full max-w-[370px]">
          <div className="gf-eyebrow">
            {tab === "register" ? "GET STARTED" : "WELCOME BACK"}
          </div>
          <h2 className="font-display mt-2 text-2xl font-bold leading-snug text-[#26342a] dark:text-stone-100">
            {tab === "register"
              ? "Create your learning account."
              : "Let's pick up where you left off."}
          </h2>
          <p className="mt-1.5 text-xs text-[#929b94]">
            {tab === "register"
              ? "Register with your name, email, and password to store your study materials."
              : "Sign in to access your saved subjects, quizzes, and gap reports."}
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-lg border border-[#e5e9e4] dark:border-stone-800 bg-[#f6f7f5] dark:bg-stone-900 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError("");
              }}
              className={`rounded-md py-1.5 text-xs font-bold transition ${
                tab === "register"
                  ? "bg-white dark:bg-stone-800 text-[#202a25] dark:text-stone-100 shadow-2xs"
                  : "text-[#78817b] hover:text-[#202a25]"
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
              }}
              className={`rounded-md py-1.5 text-xs font-bold transition ${
                tab === "login"
                  ? "bg-white dark:bg-stone-800 text-[#202a25] dark:text-stone-100 shadow-2xs"
                  : "text-[#78817b] hover:text-[#202a25]"
              }`}
            >
              Sign in
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-[11px] font-bold text-[#5b665d] dark:text-stone-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-[#e5e9e4] dark:border-stone-700 bg-white dark:bg-stone-900 px-3 text-xs text-[#536057] dark:text-stone-100 focus:border-[#8eaf81] focus:outline-none focus:ring-3 focus:ring-[#8eaf81]/15"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#5b665d] dark:text-stone-300">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-[#e5e9e4] dark:border-stone-700 bg-white dark:bg-stone-900 px-3 text-xs text-[#536057] dark:text-stone-100 focus:border-[#8eaf81] focus:outline-none focus:ring-3 focus:ring-[#8eaf81]/15"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5b665d] dark:text-stone-300">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={tab === "register" ? "new-password" : "current-password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-[#e5e9e4] dark:border-stone-700 bg-white dark:bg-stone-900 px-3 text-xs text-[#536057] dark:text-stone-100 focus:border-[#8eaf81] focus:outline-none focus:ring-3 focus:ring-[#8eaf81]/15"
              />
            </div>

            {error && <p className="text-xs font-medium text-[#b65f47]">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-between rounded-md bg-[#244b37] px-4 text-xs font-bold text-white transition hover:bg-[#193b2a] disabled:opacity-50"
            >
              <span>
                {isSubmitting
                  ? "Please wait..."
                  : tab === "register"
                  ? "Create account"
                  : "Sign in"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

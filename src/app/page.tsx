"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ProfileHud } from "@/components/ProfileHud";
import { MobileProfile } from "@/components/MobileProfile";
import { EditPanel } from "@/components/EditPanel";
import { NameTitle } from "@/components/NameTitle";
import { AuthModal } from "@/components/AuthModal";
import { SaveIndicator } from "@/components/SaveIndicator";
import { HudSkeleton } from "@/components/HudSkeleton";
import { Welcome } from "@/components/Welcome";
import { Toast, type ToastState } from "@/components/Toast";
import { useProfile } from "@/lib/useProfile";
import { track } from "@/lib/analytics";

function relTime(ts: number | null, now: number): string {
  if (!ts) return "";
  const s = Math.round((now - ts) / 1000);
  if (s < 5) return "saved just now";
  if (s < 60) return `saved ${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `saved ${m}m ago`;
  return `saved ${Math.round(m / 60)}h ago`;
}

export default function Home() {
  const {
    profile,
    hydrated,
    user,
    cloudEnabled,
    saveStatus,
    lastSavedAt,
    authError,
    dismissAuthError,
    updateData,
    toggleVisibility,
    toggleTheme,
    setPosition,
    resetPositions,
    restorePositions,
    signInEmail,
    signInGoogle,
    signOut,
  } = useProfile();

  const [panelOpen, setPanelOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [focusCategory, setFocusCategory] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);

  // keep relative "saved" time fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  // online/offline awareness
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);

  // first-run welcome (once)
  useEffect(() => {
    if (!hydrated) return;
    const welcomed = localStorage.getItem("thisisme:welcomed");
    const firstRun =
      profile.data.name === "Your Name" && !profile.data.photoDataUrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!welcomed && firstRun) setShowWelcome(true);
  }, [hydrated, profile.data.name, profile.data.photoDataUrl]);

  const dismissWelcome = () => {
    localStorage.setItem("thisisme:welcomed", "1");
    setShowWelcome(false);
  };

  const editCategory = (title: string) => {
    setFocusCategory(title);
    setPanelOpen(true);
    track("edit_category", { category: title });
  };

  const handleReset = () => {
    const prev = profile.positions;
    resetPositions();
    track("reset_layout");
    setToast({
      message: "Layout reset",
      actionLabel: "Undo",
      onAction: () => {
        restorePositions(prev);
        track("reset_layout_undo");
      },
    });
  };

  const savedLabel = relTime(lastSavedAt, now);

  return (
    <>
      <Header
        editing={panelOpen}
        setEditing={setPanelOpen}
        theme={profile.theme}
        toggleTheme={toggleTheme}
        cloudEnabled={cloudEnabled}
        userEmail={user?.email ?? null}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={signOut}
      />

      {!online && (
        <div className="bg-fg/10 px-4 py-1.5 text-center text-xs text-fg-muted">
          You&apos;re offline — changes are saved on this device and will sync when you reconnect.
        </div>
      )}

      {authError && (
        <div className="flex items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-300">
          <span>⚠️ {authError}. Please request a new sign-in link.</span>
          <button
            onClick={() => {
              dismissAuthError();
              setAuthOpen(true);
            }}
            className="rounded-md border border-amber-500/40 px-2 py-0.5 text-xs font-medium"
          >
            Sign in
          </button>
          <button onClick={dismissAuthError} className="text-xs opacity-70">
            ✕
          </button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-4">
        <NameTitle
          name={hydrated ? profile.data.name || "Your Name" : ""}
          font={profile.data.nameFont}
        />

        {!hydrated && <HudSkeleton />}

        {/* desktop / tablet: draggable float */}
        {hydrated && (
          <div className="hidden w-full sm:block">
            <ProfileHud
              profile={profile}
              setPosition={setPosition}
              onEditCategory={editCategory}
            />
            <button
              onClick={handleReset}
              className="mx-auto mt-3 block text-xs text-fg-muted transition hover:text-fg"
            >
              Reset layout
            </button>
          </div>
        )}

        {/* mobile: stacked list */}
        {hydrated && (
          <div className="w-full sm:hidden">
            <MobileProfile profile={profile} onEditCategory={editCategory} />
          </div>
        )}
      </main>

      <EditPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        profile={profile}
        update={updateData}
        toggleVisibility={toggleVisibility}
        focusCategory={focusCategory}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        signInEmail={signInEmail}
        signInGoogle={signInGoogle}
      />

      <Welcome
        open={showWelcome}
        onStart={() => {
          dismissWelcome();
          setPanelOpen(true);
        }}
        onSkip={dismissWelcome}
      />

      <SaveIndicator status={saveStatus} signedIn={!!user} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <footer className="border-t border-border px-4 py-4 text-center text-sm text-fg-muted">
        {user
          ? `thisisme · synced to ${user.email}`
          : cloudEnabled
          ? "thisisme · sign in to sync across devices"
          : "thisisme · saved on this device"}
        {savedLabel && hydrated ? ` · ${savedLabel}` : ""}
      </footer>
    </>
  );
}

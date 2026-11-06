import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";
import { passwordMatches } from "./lib/vault";
import { StoreProvider } from "./store";
import { Button, Field, Icon } from "./ui";

const RelockContext = createContext<() => void>(() => {});
export const useRelock = () => useContext(RelockContext);

function LockScreen({ onUnlock }: { onUnlock: (password: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const fails = useRef(0);
  const timer = useRef(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || wait > 0 || !value) return;
    setBusy(true);
    setError("");
    const ok = await passwordMatches(value);
    setBusy(false);
    if (ok) { onUnlock(value); return; }
    fails.current += 1;
    setValue("");
    if (fails.current < 5) { setError("Wrong password"); return; }
    fails.current = 0;
    setWait(20);
    setError("Too many tries. Wait 20 seconds.");
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setWait((w) => {
        if (w <= 1) { window.clearInterval(timer.current); return 0; }
        return w - 1;
      });
    }, 1000);
  };

  return (
    <div className="app-frame min-h-[100dvh] flex items-center justify-center px-margin py-space-xl">
      <form onSubmit={submit} className="glass rounded-xl p-space-lg w-full max-w-md flex flex-col gap-space-lg">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Infizo" className="h-8 w-auto self-start mix-blend-screen" />
        <div>
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-space-md">
            <Icon name="lock" />
          </div>
          <h1 className="font-headline text-headline-lg text-white">Shop locked</h1>
          <p className="font-body text-body-md text-white/70 mt-2">Enter the shop password to open tickets on this browser.</p>
        </div>
        <Field label="Shop password" icon="lock" type="password" autoFocus autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
        {error && <p className="text-body-sm text-error">{wait > 0 ? `${error.replace(/\.$/, "")} (${wait}s)` : error}</p>}
        <Button type="submit" busy={busy} disabled={wait > 0} icon="lock_open">Unlock</Button>
      </form>
    </div>
  );
}

export function Gate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(null);
  if (!password) return <LockScreen onUnlock={setPassword} />;
  return (
    <RelockContext.Provider value={() => setPassword(null)}>
      <StoreProvider password={password}>{children}</StoreProvider>
    </RelockContext.Provider>
  );
}

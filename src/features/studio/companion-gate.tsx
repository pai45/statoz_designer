"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, configureApi, resetApi, validateLoopbackApi } from "@/shared/api";
import { DemoStudio, type DemoConnectionState } from "./demo-studio";
import { Studio } from "./studio";

type TokenResponse = { token: string; expiresAt: string };
type State = DemoConnectionState | "connected";

export function CompanionGate() {
  const [state, setState] = useState<State>("disconnected");
  const [detail, setDetail] = useState("");
  const didPair = useRef(false);

  const pair = useCallback(async (nonce: string, suppliedApi: string) => {
    setState("connecting"); setDetail("");
    try {
      const baseUrl = validateLoopbackApi(suppliedApi);
      configureApi({ baseUrl, accessToken: undefined, mediaToken: undefined, onUnauthorized: () => setState("expired") });
      const session = await api<TokenResponse>("session", { method: "POST", body: JSON.stringify({ nonce }) });
      configureApi({ accessToken: session.token });
      const media = await api<TokenResponse>("session/media-token");
      configureApi({ mediaToken: media.token });
      setState("connected");
    } catch (error) {
      resetApi(); setState(error instanceof ApiError && error.status === 401 ? "expired" : "error");
      setDetail(error instanceof TypeError ? "The browser could not reach the companion. Start it, allow loopback access when prompted, then connect again." : (error as Error).message);
    }
  }, []);

  useEffect(() => {
    resetApi();
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const nonce = fragment.get("pair"), apiBase = fragment.get("api");
    if (!nonce || !apiBase || didPair.current) return;
    didPair.current = true;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    queueMicrotask(() => void pair(nonce, apiBase));
  }, [pair]);

  if (state === "connected") return <Studio/>;
  const openCompanion = () => window.location.assign("http://127.0.0.1:3000/connect");
  return <DemoStudio connectionState={state} detail={detail} onConnect={openCompanion}/>;
}

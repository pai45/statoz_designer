"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Icon, Tag } from "@/design-system/components/ui";
import { ApiError, api, configureApi, publicAsset, resetApi, validateLoopbackApi } from "@/shared/api";
import { Studio } from "./studio";
import "./companion.css";

type TokenResponse = { token: string; expiresAt: string };
type State = "disconnected" | "connecting" | "connected" | "expired" | "error";

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
  return <main className="companion-gate">
    <div className="companion-grid" aria-hidden="true"/>
    <section className="companion-panel" aria-live="polite">
      <div className="companion-lockup"><img src={publicAsset("/assets/brand/logo.png")} alt=""/><span>StatOz<small>DESIGNER</small></span></div>
      <Tag>{state === "connecting" ? "CONNECTING" : state === "expired" ? "SESSION ENDED" : "LOCAL COMPANION"}</Tag>
      <h1>{state === "connecting" ? "Opening your workspace." : state === "expired" ? "Reconnect this tab." : "Your full Studio. Your computer."}</h1>
      <p>{state === "connecting" ? "The Pages interface is pairing with the StatOz service on this device." : "GitHub Pages provides the interface. Projects, registered media, exports, assistant sign-ins, and posting sessions stay on this computer."}</p>
      {detail && <div className="companion-error" role="alert"><Icon name="close" size={17}/><span>{detail}</span></div>}
      {state !== "connecting" && <Button onClick={openCompanion}><Icon name="lock" size={17}/>{state === "expired" ? "Reconnect companion" : "Connect local companion"}</Button>}
      {state === "connecting" && <div className="companion-progress"><i/><span>PAIRING OVER LOOPBACK</span></div>}
      <ol className="companion-steps">
        <li><b>01</b><span>Start the project with <code>npm run dev</code> or <code>npm start</code>.</span></li>
        <li><b>02</b><span>Open the printed <code>/connect</code> link. Custom ports use that exact link.</span></li>
        <li><b>03</b><span>Allow local-network access if Chrome or Edge asks.</span></li>
      </ol>
      <small className="companion-note">Chrome, Edge, and Firefox are supported. Safari loopback access is not supported.</small>
    </section>
  </main>;
}

import type { Platform } from "@/domain/publish";
import type { Adapter } from "./composer";
import { instagram } from "./platforms/instagram";
import { linkedin } from "./platforms/linkedin";
import { x } from "./platforms/x";
import { youtube } from "./platforms/youtube";

export const adapters: Record<Platform, Adapter> = { linkedin, youtube, instagram, x };

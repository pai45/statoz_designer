import { z } from "zod";
import { sports } from "./project";

// The player library is local sample data. Names, clubs and nations are invented for
// the studio; they are not real athletes, teams or endorsements.
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const label = z.string().max(60);
export const playerMetricsSchema = z.object({ pace: z.number().int().min(0).max(100), skill: z.number().int().min(0).max(100), form: z.number().int().min(0).max(100) });
export const playerInputSchema = z.object({
  name: z.string().min(1).max(60), position: label, club: label, nation: label,
  sport: z.enum(Object.keys(sports) as [keyof typeof sports, ...(keyof typeof sports)[]]),
  rating: z.number().int().min(0).max(100), metrics: playerMetricsSchema,
  portraitAssetId: id.or(z.literal("")),
});
export const playerSchema = playerInputSchema.extend({
  schemaVersion: z.literal(1), id, source: z.string().max(300), sample: z.boolean(),
  createdAt: z.string(), updatedAt: z.string(),
});
export type PlayerInput = z.infer<typeof playerInputSchema>;
export type Player = z.infer<typeof playerSchema>;

export function playerMatches(player: Player, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return needle.split(/\s+/).every(part => [player.name, player.position, player.club, player.nation].some(field => field.toLowerCase().includes(part)));
}

const sample = (id: string, sport: PlayerInput["sport"], name: string, position: string, club: string, nation: string, rating: number, pace: number, skill: number, form: number): PlayerInput & { id: string } =>
  ({ id, sport, name, position, club, nation, rating, metrics: { pace, skill, form }, portraitAssetId: "" });

export const samplePlayers = [
  sample("sample-ari-vance", "football", "ARI VANCE", "MIDFIELDER", "NORTH FC", "ATLANTIA", 92, 94, 91, 89),
  sample("sample-theo-brandt", "football", "THEO BRANDT", "STRIKER", "SOUTH FC", "VERDAIS", 89, 92, 86, 88),
  sample("sample-kai-osei", "football", "KAI OSEI", "DEFENDER", "HARBOUR UNITED", "SOLARA", 87, 84, 88, 85),
  sample("sample-lena-fiore", "football", "LENA FIORE", "GOALKEEPER", "NORTH FC", "ATLANTIA", 90, 78, 93, 90),
  sample("sample-ravi-deol", "cricket", "RAVI DEOL", "ALL-ROUNDER", "DELTA KINGS", "MARAVI", 91, 85, 93, 90),
  sample("sample-imogen-hale", "cricket", "IMOGEN HALE", "OPENER", "COASTAL XI", "ALDERNEY", 88, 87, 90, 84),
  sample("sample-marco-ellis", "basketball", "MARCO ELLIS", "POINT GUARD", "CITY VOLTS", "NORTHAM", 93, 95, 92, 90),
  sample("sample-nia-okonkwo", "basketball", "NIA OKONKWO", "CENTER", "SUMMIT JETS", "NORTHAM", 90, 82, 91, 93),
  sample("sample-sofia-renn", "tennis", "SOFIA RENN", "BASELINE", "INDEPENDENT", "VERDAIS", 94, 93, 95, 92),
  sample("sample-daniel-arce", "tennis", "DANIEL ARCE", "SERVE AND VOLLEY", "INDEPENDENT", "SOLARA", 89, 91, 88, 86),
  sample("sample-eva-lindqvist", "motorsport", "EVA LINDQVIST", "LEAD DRIVER", "APEX RACING", "NORDVIK", 92, 96, 90, 88),
  sample("sample-omar-haddad", "motorsport", "OMAR HADDAD", "LEAD DRIVER", "VECTOR GP", "MARAVI", 88, 93, 86, 87),
];
export const sampleSource = "StatOz Designer sample player library. Invented player, club and nation names.";

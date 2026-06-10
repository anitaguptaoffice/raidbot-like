"use client";

import type { TopGearCandidate } from "@/shared/sim-api";

export type LocalTopGearCombo = {
  trinket1: TopGearCandidate;
  trinket2: TopGearCandidate;
};

const ACTIVE_TRINKET_PATTERN = /^trinket([12])=(.+)$/i;
const BAG_TRINKET_PATTERN = /^#\s*trinket([12])=(.+)$/i;
const ITEM_COMMENT_PATTERN = /^#\s*(.+?)\s*\((\d+)\)\s*$/;

function extractFieldsFromKey(key: string) {
  const normalized = key.replace(/^,/, "").replaceAll(",", "&");
  const params = new URLSearchParams(normalized);
  const itemIdRaw = params.get("id");
  const bonusId = params.get("bonus_id");
  const itemId = itemIdRaw ? Number(itemIdRaw) : NaN;
  const validItemId = Number.isFinite(itemId) ? itemId : null;
  const wowheadBonus = bonusId ? bonusId.replaceAll("/", ":") : null;

  return {
    itemId: validItemId,
    bonusId: bonusId ?? null,
    wowheadQuery: validItemId
      ? `item=${validItemId}${wowheadBonus ? `&bonus=${wowheadBonus}` : ""}`
      : null,
    wowheadUrl: validItemId
      ? `https://www.wowhead.com/item=${validItemId}${wowheadBonus ? `?bonus=${wowheadBonus}` : ""}`
      : null,
  };
}

function findItemCommentMeta(lines: string[], index: number) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();

    if (!line || /^#\s*$/.test(line) || /^#\s*trinket[12]=/i.test(line)) {
      continue;
    }

    const match = ITEM_COMMENT_PATTERN.exec(line);
    if (match) {
      const itemLevel = Number(match[2]);
      return {
        name: match[1].trim(),
        itemLevel: Number.isFinite(itemLevel) ? itemLevel : null,
      };
    }

    if (!line.startsWith("#")) {
      break;
    }
  }

  return {
    name: null as string | null,
    itemLevel: null as number | null,
  };
}

export function extractLocalTopGearCandidates(profile: string): TopGearCandidate[] {
  const lines = profile.split(/\r?\n/);
  const seen = new Set<string>();
  const candidates: TopGearCandidate[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const activeMatch = ACTIVE_TRINKET_PATTERN.exec(line);
    const bagMatch = BAG_TRINKET_PATTERN.exec(line);
    const match = activeMatch ?? bagMatch;

    if (!match) {
      continue;
    }

    const key = (match[2] ?? "").trim();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    const fields = extractFieldsFromKey(key);
    const commentMeta = findItemCommentMeta(lines, index);

    candidates.push({
      id: `trinket_${candidates.length + 1}`,
      key,
      source: activeMatch ? "equipped" : "bags",
      slot: Number(match[1]) === 1 ? "trinket1" : "trinket2",
      itemId: fields.itemId,
      bonusId: fields.bonusId,
      wowheadUrl: fields.wowheadUrl,
      wowheadQuery: fields.wowheadQuery,
      name: commentMeta.name ?? (fields.itemId ? `Item #${fields.itemId}` : "未知饰品"),
      itemLevel: commentMeta.itemLevel,
    });
  }

  return candidates;
}

export function buildLocalTopGearCombos(candidates: TopGearCandidate[], limit: number) {
  const combos: LocalTopGearCombo[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      combos.push({
        trinket1: candidates[i],
        trinket2: candidates[j],
      });

      if (combos.length >= limit) {
        return combos;
      }
    }
  }

  return combos;
}

export function applyLocalTopGearComboToProfile(profile: string, combo: LocalTopGearCombo) {
  const filtered = profile
    .split(/\r?\n/)
    .filter((line) => !/^\s*trinket[12]=/i.test(line))
    .join("\n")
    .trimEnd();

  return `${[filtered, `trinket1=${combo.trinket1.key}`, `trinket2=${combo.trinket2.key}`]
    .filter(Boolean)
    .join("\n")}\n`;
}


/**
 * Dice engine — d20 system core for D&D 5e.
 * 骰子引擎 — D&D 5e d20系统核心。
 */
export function roll(expr: string): { rolls: number[]; total: number; expr: string } {
  const m = expr.match(/^(\d+)?d(\d+)([+-]\d+)?$/);
  if (!m) return { rolls: [], total: 0, expr };
  const count = parseInt(m[1] || '1'), sides = parseInt(m[2]), mod = parseInt(m[3] || '0');
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  return { rolls, total: rolls.reduce((s, r) => s + r, 0) + mod, expr };
}

export function abilityMod(score: number): number { return Math.floor((score - 10) / 2); }
export function profBonus(level: number): number { return Math.floor((level - 1) / 4) + 2; }

export function d20Check(opts: {
  attrMod: number; profBonus?: number; dc?: number; advantage?: boolean; disadvantage?: boolean;
}): { roll: number; total: number; success?: boolean; nat20: boolean; nat1: boolean } {
  let roll = Math.floor(Math.random() * 20) + 1, roll2 = 0;
  if (opts.advantage && !opts.disadvantage) { roll2 = Math.floor(Math.random() * 20) + 1; roll = Math.max(roll, roll2); }
  else if (opts.disadvantage && !opts.advantage) { roll2 = Math.floor(Math.random() * 20) + 1; roll = Math.min(roll, roll2); }
  const total = roll + (opts.profBonus || 0) + opts.attrMod;
  const r = { roll, total, success: undefined as boolean | undefined, nat20: roll === 20, nat1: roll === 1 };
  if (opts.dc !== undefined) r.success = r.nat20 ? true : r.nat1 ? false : total >= opts.dc;
  return r;
}

export function initiative(dexMod: number) { return d20Check({ attrMod: dexMod }).total; }
export function attackRoll(mod: number, prof: number, ac: number): { hit: boolean; crit: boolean; total: number } {
  const c = d20Check({ attrMod: mod, profBonus: prof, dc: ac });
  return { hit: c.success!, crit: c.nat20, total: c.total };
}
export function damageRoll(dice: string, mod: number) { return roll(dice).total + mod; }
export function maxHP(hitDice: string, conMod: number, level: number): number {
  const max = parseInt(hitDice.replace('d', ''));
  return max + conMod + (level - 1) * (Math.ceil(max / 2) + 1 + conMod);
}

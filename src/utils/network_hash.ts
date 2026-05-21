/**
 * ネットワーク構造のハッシュ計算
 *
 * SCAT ネットワーク {nodes, edges} の "意味的同一性" を判定するために、
 * 順序非依存・属性正規化したハッシュを返す。
 *
 * 仕様: docs/analysis/scat_to_ism_pipeline.md §8
 */

export interface HashableNetwork {
  nodes: Array<{ id: string }>;
  edges: Array<{ source: string; target: string }>;
}

/**
 * 軽量で衝突確率の十分低いハッシュ (FNV-1a 32bit を 2 系統取って 64bit 相当に)
 * Web Crypto に依存しないので Cloudflare Workers でも同期で使える
 */
function fnv1aPair(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 ^= c;
    h2 = (h2 * 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export function networkHash(net: HashableNetwork): string {
  const nodeIds = [...new Set(net.nodes.map((n) => String(n.id)))].sort();
  const edgeKeys = [
    ...new Set(
      net.edges.map((e) => {
        const a = String(e.source);
        const b = String(e.target);
        return a < b ? `${a}||${b}` : `${b}||${a}`; // 無向化
      }),
    ),
  ].sort();
  const canonical = `N:${nodeIds.join(",")}|E:${edgeKeys.join(",")}`;
  return fnv1aPair(canonical);
}

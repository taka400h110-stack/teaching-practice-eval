// 日本語仮名リスト（学生の仮名表示用）
const PSEUDONYM_LABELS = [
  "学生A", "学生B", "学生C", "学生D", "学生E",
  "学生F", "学生G", "学生H", "学生I", "学生J",
  "学生K", "学生L", "学生M", "学生N", "学生O",
  "学生P", "学生Q", "学生R", "学生S", "学生T",
];

// IDから決定論的に仮名インデックスを生成
function pseudonymIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % PSEUDONYM_LABELS.length;
}

function getPseudonymName(id: string): string {
  return PSEUDONYM_LABELS[pseudonymIndex(id)];
}

function hashShort(str: string) {
  // Simple deterministic hash for pseudonymization
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

export function applyAnonymization(
  data: any,
  options: {
    role: string;
    anonymizationLevel: 'raw' | 'pseudonymized' | 'aggregated';
    resourceType: string;
  }
): any {
  if (options.anonymizationLevel === 'raw') return data;

  if (Array.isArray(data)) {
    // Cell suppression for aggregated
    if (options.anonymizationLevel === 'aggregated' && data.length < 5) {
      return { message: "suppressed due to small sample size" };
    }

    return data.map((item) => applyAnonymizationToItem(item, options));
  }

  return applyAnonymizationToItem(data, options);
}

function applyAnonymizationToItem(
  item: any,
  options: { anonymizationLevel: string; resourceType: string }
) {
  const result = { ...item };

  if (
    options.anonymizationLevel === 'pseudonymized' ||
    options.anonymizationLevel === 'aggregated'
  ) {
    // 元のIDを使って決定論的な仮名を生成
    const sourceId = result.id || result.student_id || "";

    // student_idをハッシュ化
    if (result.student_id) {
      result.student_id = `R-${hashShort(result.student_id)}`;
    }

    // nameをdelete（空文字列）ではなく仮名に置換
    if ('name' in result) {
      if (options.anonymizationLevel === 'pseudonymized') {
        result.name = getPseudonymName(sourceId);
      } else {
        // aggregated: 名前を完全に削除
        delete result.name;
      }
    }

    // 個人識別情報を削除
    delete result.email;
    delete result.student_number;
    delete result.phone;
    delete result.address;

    // リソースタイプ別の追加匿名化
    if (options.resourceType === 'journal') {
      delete result.content;
      delete result.tags;
    }

    if (options.resourceType === 'evaluation') {
      delete result.comment;
    }
  }

  return result;
}

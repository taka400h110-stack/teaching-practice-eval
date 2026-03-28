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
    
    return data.map(item => applyAnonymizationToItem(item, options));
  }
  
  return applyAnonymizationToItem(data, options);
}

function applyAnonymizationToItem(item: any, options: { anonymizationLevel: string, resourceType: string }) {
  const result = { ...item };
  
  if (options.anonymizationLevel === 'pseudonymized' || options.anonymizationLevel === 'aggregated') {
    if (result.student_id) {
      result.student_id = `R-${hashShort(result.student_id)}`;
    }
    delete result.name;
    delete result.email;
    delete result.student_number;
    
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

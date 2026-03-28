export const getVisualThreshold = (category: 'desktop' | 'mobile' | 'component' | 'chart') => {
  switch(category) {
    case 'desktop': return { maxDiffPixelRatio: 0.01 };
    case 'mobile': return { maxDiffPixelRatio: 0.015 };
    case 'component': return { maxDiffPixelRatio: 0.005 };
    case 'chart': return { maxDiffPixelRatio: 0.02 };
    default: return { maxDiffPixelRatio: 0.01 };
  }
}

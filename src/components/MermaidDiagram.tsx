import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      }).catch((e) => {
        console.error('Mermaid render error', e);
        if (ref.current) {
          ref.current.innerHTML = `<div style="color: red;">Failed to render diagram</div>`;
        }
      });
    }
  }, [chart]);

  return <div ref={ref} className="mermaid" />;
};

export default MermaidDiagram;

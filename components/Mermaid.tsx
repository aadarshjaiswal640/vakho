import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  
  useEffect(() => {
    // Initialize once on mount with safer config for constrained layouts
    try {
      mermaid.initialize({ 
          startOnLoad: false, 
          theme: 'dark', 
          securityLevel: 'loose',
          fontFamily: 'Inter',
          logLevel: 'error',
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis'
          }
      });
    } catch (e) {
      console.error("Mermaid init error", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: any;

    const renderChart = async () => {
        if (!containerRef.current || !chart || chart.length < 3) return;

        // Double check dimensions
        if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
            // If dimensions are 0, it might be hidden or initializing. 
            // We retry once after a short delay.
            return; 
        }

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Render
            // We wrap in requestAnimationFrame to ensure we aren't mid-layout-thrashing
            requestAnimationFrame(async () => {
                if (!mounted) return;
                try {
                    const { svg } = await mermaid.render(id, chart);
                    if (mounted) {
                        setSvgContent(svg);
                        setError(false);
                    }
                } catch (err: any) {
                    // Suppress the specific layout error that happens during animations
                    if (err.message && err.message.includes('suitable point')) {
                        console.warn("Mermaid layout warning (transient):", err.message);
                    } else {
                        console.error("Mermaid Render Error:", err);
                    }
                    if (mounted) setError(true);
                }
            });
        } catch (err: any) {
            if (mounted) setError(true);
        }
    };

    // Increase delay slightly to allow CSS transitions (like fades) to settle
    timeoutId = setTimeout(renderChart, 300);
    
    return () => { 
        mounted = false; 
        clearTimeout(timeoutId);
    };
  }, [chart]);

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden p-4 relative">
        {error ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-slate-600 text-xs italic flex flex-col items-center gap-2">
                    <span>Visualization pending...</span>
                </div>
            </div>
        ) : (
            <div 
                ref={containerRef}
                className="w-full h-full flex items-center justify-center mermaid-container"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
            />
        )}
    </div>
  );
};
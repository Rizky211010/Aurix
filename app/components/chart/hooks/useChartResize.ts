'use client';

import { useEffect, useCallback, RefObject } from 'react';
import { IChartApi } from 'lightweight-charts';

interface UseChartResizeOptions {
  chartRef: RefObject<IChartApi | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useChartResize({ chartRef, containerRef }: UseChartResizeOptions) {
  const handleResize = useCallback(() => {
    if (chartRef.current && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      chartRef.current.applyOptions({
        width,
        height,
      });
      chartRef.current.timeScale().fitContent();
    }
  }, [chartRef, containerRef]);

  useEffect(() => {
    // Initial resize
    handleResize();

    // Create ResizeObserver for container resize detection
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleResize);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, containerRef]);

  return { handleResize };
}

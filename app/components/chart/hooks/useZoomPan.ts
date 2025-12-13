'use client';

import { useEffect, useRef, useCallback } from 'react';
import { IChartApi, Logical } from 'lightweight-charts';

interface UseZoomPanOptions {
  chartRef: React.MutableRefObject<IChartApi | null>;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  enabled?: boolean;
  minZoom?: number;  // Minimum candles visible (e.g., 3)
  maxZoom?: number;  // Maximum candles visible (e.g., 100)
  zoomSensitivity?: number; // Scroll wheel sensitivity (0.1-1.0)
  enableAutoHideOnZoom?: boolean; // Hide details when zoomed out
  onVisibleRangeChange?: (from: number, to: number) => void; // Callback when visible range changes
}

interface ZoomState {
  visibleCandles: number;
  isZoomedOut: boolean;
}

/**
 * Custom hook for smooth zoom and pan interactions on lightweight-charts
 * 
 * Features:
 * - Scroll wheel zoom with cursor position awareness
 * - Drag-to-pan with kinetic scrolling
 * - Double-click to reset zoom
 * - Auto-hide details on zoom out (optional)
 * - Smooth animations with easing
 */
export function useZoomPan({
  chartRef,
  containerRef,
  enabled = true,
  minZoom = 3,
  maxZoom = 100,
  zoomSensitivity = 0.2,
  enableAutoHideOnZoom = true,
  onVisibleRangeChange,
}: UseZoomPanOptions) {
  const zoomStateRef = useRef<ZoomState>({
    visibleCandles: 20,
    isZoomedOut: false,
  });

  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startTime: 0,
    velocity: 0,
    lastX: 0,
  });

  const kinematicRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapRef = useRef({ lastTime: 0, lastX: 0 });

  // Get current visible range of candles
  const getVisibleCandleCount = useCallback(() => {
    if (!chartRef.current) return minZoom;
    try {
      const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        const count = logicalRange.to - logicalRange.from;
        return Math.max(minZoom, Math.min(maxZoom, Math.round(count)));
      }
    } catch (e) {
      console.error('[useZoomPan] Error getting visible range:', e);
    }
    return minZoom;
  }, [chartRef, minZoom, maxZoom]);

  // Update zoom state and apply auto-hide logic
  const updateZoomState = useCallback(() => {
    if (!chartRef.current) return;

    const visibleCandles = getVisibleCandleCount();
    const threshold = (minZoom + maxZoom) / 2; // Middle point
    const isZoomedOut = visibleCandles > threshold;

    zoomStateRef.current = { visibleCandles, isZoomedOut };

    if (enableAutoHideOnZoom && containerRef.current) {
      // Auto-hide time labels and price levels when zoomed out
      const shouldHideDetails = isZoomedOut;
      containerRef.current.setAttribute(
        'data-zoom-level',
        shouldHideDetails ? 'out' : 'in'
      );
    }

    // Notify callback of visible range change
    if (onVisibleRangeChange) {
      try {
        const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
        if (logicalRange) {
          onVisibleRangeChange(
            Math.floor(logicalRange.from as number),
            Math.ceil(logicalRange.to as number)
          );
        }
      } catch {
        // Ignore errors
      }
    }

    console.log(`[useZoomPan] Visible: ${visibleCandles} candles, Zoom: ${isZoomedOut ? 'OUT' : 'IN'}`);
  }, [chartRef, containerRef, enableAutoHideOnZoom, getVisibleCandleCount, minZoom, maxZoom, onVisibleRangeChange]);

  // Smooth zoom with easing - zoom toward cursor position
  const handleZoom = useCallback(
    (delta: number, cursorX?: number) => {
      if (!chartRef.current) return;

      try {
        const timeScale = chartRef.current.timeScale();
        const logicalRange = timeScale.getVisibleLogicalRange();

        if (!logicalRange) return;

        // Calculate zoom factor with sensitivity
        const zoomFactor = 1 + (delta > 0 ? zoomSensitivity : -zoomSensitivity);
        const currentWidth = logicalRange.to - logicalRange.from;
        const newWidth = currentWidth / zoomFactor;

        // Clamp to min/max zoom levels
        const clampedWidth = Math.max(
          minZoom,
          Math.min(maxZoom, newWidth)
        );

        if (clampedWidth === currentWidth) return; // No change needed

        // Calculate zoom center point
        let centerFrom: number = logicalRange.from as number;
        if (cursorX !== undefined && containerRef.current) {
          // Zoom toward cursor position
          const containerWidth = containerRef.current.clientWidth;
          const cursorRatio = cursorX / containerWidth;
          const centerPoint = (logicalRange.from as number) + currentWidth * cursorRatio;
          centerFrom = centerPoint - (clampedWidth * cursorRatio);
        } else {
          // Zoom toward center if no cursor position
          const center = (logicalRange.from as number) + currentWidth / 2;
          centerFrom = center - clampedWidth / 2;
        }

        const newRange = {
          from: Math.max(0, centerFrom) as Logical,
          to: Math.max(clampedWidth, centerFrom + clampedWidth) as Logical,
        };

        timeScale.setVisibleLogicalRange(newRange);
        updateZoomState();
      } catch (e) {
        console.error('[useZoomPan] Zoom error:', e);
      }
    },
    [chartRef, containerRef, minZoom, maxZoom, zoomSensitivity, updateZoomState]
  );

  // Handle scroll wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled || !chartRef.current) return;

      // Only zoom if scrolling on chart, not on UI elements
      if (
        e.target &&
        (e.target as HTMLElement).closest('[data-no-zoom]')
      ) {
        return;
      }

      e.preventDefault();

      const delta = e.deltaY > 0 ? 1 : -1;
      const rect = containerRef.current?.getBoundingClientRect();
      const cursorX = rect ? e.clientX - rect.left : undefined;

      handleZoom(delta, cursorX);
    },
    [enabled, chartRef, containerRef, handleZoom]
  );

  // Handle drag pan with kinetic scrolling
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !chartRef.current) return;
      if (e.button !== 0) return; // Only left mouse button

      // Check for double-click reset
      const now = Date.now();
      if (
        now - doubleTapRef.current.lastTime < 300 &&
        Math.abs(e.clientX - doubleTapRef.current.lastX) < 10
      ) {
        // Double-click detected - scroll to latest candle (realtime)
        try {
          chartRef.current.timeScale().scrollToRealTime();
          updateZoomState();
          console.log('[useZoomPan] Double-click: Scrolled to latest candle');
        } catch (err) {
          console.error('[useZoomPan] Error scrolling to realtime:', err);
        }
        doubleTapRef.current = { lastTime: 0, lastX: 0 };
        return;
      }

      doubleTapRef.current = { lastTime: now, lastX: e.clientX };

      dragStateRef.current = {
        isDragging: true,
        startX: e.clientX,
        startTime: now,
        velocity: 0,
        lastX: e.clientX,
      };

      // Cancel any ongoing kinetic scrolling
      if (kinematicRef.current) {
        clearInterval(kinematicRef.current);
      }
    },
    [enabled, chartRef, updateZoomState]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !chartRef.current) return;

      try {
        const timeScale = chartRef.current.timeScale();
        const logicalRange = timeScale.getVisibleLogicalRange();

        if (!logicalRange) return;

        const deltaX = e.clientX - dragStateRef.current.lastX;
        dragStateRef.current.lastX = e.clientX;

        // Calculate velocity for kinetic scrolling
        dragStateRef.current.velocity = deltaX;

        // Pan by shifting the logical range
        const width = logicalRange.to - logicalRange.from;
        const shift = (deltaX / (containerRef.current?.clientWidth || 1)) * width;

        const newRange = {
          from: logicalRange.from - shift,
          to: logicalRange.to - shift,
        };

        timeScale.setVisibleLogicalRange(newRange);
      } catch (e) {
        console.error('[useZoomPan] Pan error:', e);
      }
    },
    [chartRef, containerRef]
  );

  const handleMouseUp = useCallback(
    () => {
      if (!dragStateRef.current.isDragging) return;

      dragStateRef.current.isDragging = false;

      // Apply kinetic scrolling momentum
      if (Math.abs(dragStateRef.current.velocity) > 1) {
        const momentum = dragStateRef.current.velocity * 0.95; // Friction coefficient
        let currentMomentum = momentum;

        kinematicRef.current = setInterval(() => {
          if (!chartRef.current || Math.abs(currentMomentum) < 0.5) {
            if (kinematicRef.current) {
              clearInterval(kinematicRef.current);
            }
            return;
          }

          try {
            const timeScale = chartRef.current!.timeScale();
            const logicalRange = timeScale.getVisibleLogicalRange();

            if (!logicalRange) return;

            const width = logicalRange.to - logicalRange.from;
            const shift =
              (currentMomentum / (containerRef.current?.clientWidth || 1)) * width;

            const newRange = {
              from: logicalRange.from - shift,
              to: logicalRange.to - shift,
            };

            timeScale.setVisibleLogicalRange(newRange);
            currentMomentum *= 0.92; // Continued friction
          } catch (err) {
            console.error('[useZoomPan] Kinetic scroll error:', err);
            if (kinematicRef.current) {
              clearInterval(kinematicRef.current);
            }
          }
        }, 16); // ~60fps
      }
    },
    [chartRef, containerRef]
  );

  // Attach event listeners
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Update zoom state on mount
    updateZoomState();

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (kinematicRef.current) {
        clearInterval(kinematicRef.current);
      }
    };
  }, [enabled, containerRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, updateZoomState]);

  // Expose reset function for external control - scroll to latest candle
  const resetZoom = useCallback(() => {
    if (!chartRef.current) return;
    try {
      // Scroll to the right (latest candle) instead of fitting all content
      chartRef.current.timeScale().scrollToRealTime();
      updateZoomState();
      console.log('[useZoomPan] Reset: scrolled to latest candle (realtime)');
    } catch (e) {
      console.error('[useZoomPan] Reset error:', e);
    }
  }, [chartRef, updateZoomState]);

  // Fit all content (show entire history)
  const fitAll = useCallback(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.timeScale().fitContent();
      updateZoomState();
      console.log('[useZoomPan] Fit all: showing entire history');
    } catch (e) {
      console.error('[useZoomPan] Fit all error:', e);
    }
  }, [chartRef, updateZoomState]);

  return {
    resetZoom,    // Scroll to latest (realtime)
    fitAll,       // Show entire history
    zoomState: zoomStateRef.current,
    isZoomedOut: zoomStateRef.current.isZoomedOut,
    visibleCandles: zoomStateRef.current.visibleCandles,
  };
}

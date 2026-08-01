import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface VirtualGrid {
  ref: RefObject<HTMLDivElement | null>;
  columns: number;
  start: number;
  end: number;
  totalHeight: number;
  offsetY: number;
}

export function useVirtualGrid(
  itemCount: number,
  rowHeight: number,
  minColumnWidth: number,
  gap: number,
  overscanRows = 2,
): VirtualGrid {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onScroll = () => setScrollTop(element.scrollTop);
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  const columns = Math.max(1, Math.floor((viewport.width + gap) / (minColumnWidth + gap)));
  const rows = Math.ceil(itemCount / columns);
  const stride = rowHeight + gap;

  const firstRow = Math.max(0, Math.floor(scrollTop / stride) - overscanRows);
  const visibleRows = Math.ceil(viewport.height / stride) + overscanRows * 2;
  const lastRow = Math.min(rows, firstRow + visibleRows);

  return {
    ref,
    columns,
    start: firstRow * columns,
    end: Math.min(itemCount, lastRow * columns),
    totalHeight: Math.max(0, rows * stride - gap),
    offsetY: firstRow * stride,
  };
}

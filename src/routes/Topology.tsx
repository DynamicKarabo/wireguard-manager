import { useRef, useEffect, useState, useCallback } from 'react';
import { useServers, useAllPeers } from '@/lib/hooks';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  name: string;
  type: 'server' | 'peer';
  serverId?: string;
  health?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

export default function Topology() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const { data: servers, isLoading: sLoading } = useServers();
  const { peers: allPeers, isLoading: pLoading } = useAllPeers(servers);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container size (debounced)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver((entries) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const h = Math.max(400, entry.contentRect.height - 20);
          setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
        }
      }, 150);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !servers || !allPeers.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Build nodes and links
    const nodes: GraphNode[] = [
      ...servers.map((s) => ({ id: s.id, name: s.name, type: 'server' as const })),
      ...allPeers.map((p) => ({
        id: p.id,
        name: p.name,
        type: 'peer' as const,
        serverId: p.serverId,
        health: p.health,
      })),
    ];

    const links: GraphLink[] = allPeers
      .filter((p) => p.enabled)
      .map((p) => ({ source: p.serverId, target: p.id }));

    // Create the simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30));

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Edges
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--border-strong)')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6);

    // Servers (hexagon - rendered as polygon)
    const serverG = g.append('g');
    const serverNodes = serverG.selectAll<SVGPolygonElement, GraphNode>('polygon')
      .data(nodes.filter((n) => n.type === 'server'))
      .join('polygon')
      .attr('fill', 'var(--accent)')
      .attr('opacity', 0.9)
      .attr('points', () => {
        const r = 16;
        return Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
        }).join(' ');
      });

    // Peers (shape varies by health)
    const peerG = g.append('g');
    const peerNodesData = nodes.filter((n) => n.type === 'peer');
    const peerNodes = peerG.selectAll<SVGElement, GraphNode>('path')
      .data(peerNodesData)
      .join('path')
      .attr('fill', (d) =>
        d.health === 'online' ? 'var(--status-online)' :
        d.health === 'degraded' ? 'var(--status-degraded)' : 'var(--status-offline)')
      .attr('opacity', 0.8)
      .attr('d', (d) => {
        const r = 7;
        if (d.health === 'online') {
          // Circle
          return d3.symbol().type(d3.symbolCircle).size(r * r * Math.PI)();
        }
        if (d.health === 'degraded') {
          // Diamond
          return d3.symbol().type(d3.symbolDiamond).size(r * r * 2)();
        }
        // Offline — X cross
        return `M${-r},${-r}L${r},${r}M${r},${-r}L${-r},${r}`;
      })
      .attr('stroke', (d) =>
        d.health === 'offline' ? 'var(--status-offline)' : 'none')
      .attr('stroke-width', (d) => d.health === 'offline' ? 2 : 0);

    // Labels
    const labelG = g.append('g');
    const labels = labelG.selectAll<SVGTextElement, GraphNode>('text')
      .data(nodes)
      .join('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'server' ? 30 : 22)
      .attr('font', '400 12px -apple-system, system-ui, sans-serif')
      .attr('fill', 'var(--text-tertiary)');

    // Hover highlight
    const allNodes = (serverNodes.nodes() as Element[]).concat(peerNodes.nodes() as Element[]);

    function highlight(nodeId: string | null) {
      if (!nodeId) {
        serverNodes.attr('opacity', 0.9);
        peerNodes.attr('opacity', 0.8);
        link.attr('opacity', 0.6);
        return;
      }

      const connected = new Set<string>([nodeId]);
      links.forEach((l: any) => {
        if (l.source.id === nodeId) connected.add(l.target.id);
        if (l.target.id === nodeId) connected.add(l.source.id);
      });

      serverNodes.attr('opacity', (d: any) => connected.has(d.id) ? 0.9 : 0.15);
      peerNodes.attr('opacity', (d: any) => connected.has(d.id) ? 0.8 : 0.1);
      link.attr('opacity', (d: any) => {
        const sid = typeof d.source === 'object' ? d.source.id : d.source;
        const tid = typeof d.target === 'object' ? d.target.id : d.target;
        return (sid === nodeId || tid === nodeId) ? 0.6 : 0.05;
      });
    }

    serverNodes.on('mouseenter', (_event, d) => highlight((d as any).id));
    peerNodes.on('mouseenter', (_event, d) => highlight((d as any).id));
    serverNodes.on('mouseleave', () => highlight(null));
    peerNodes.on('mouseleave', () => highlight(null));

    // Keyboard focus on nodes
    serverNodes.attr('tabindex', '0').attr('role', 'button');
    peerNodes.attr('tabindex', '0').attr('role', 'button');
    serverNodes.on('focus', (_event, d) => highlight((d as any).id));
    peerNodes.on('focus', (_event, d) => highlight((d as any).id));
    serverNodes.on('blur', () => highlight(null));
    peerNodes.on('blur', () => highlight(null));
    serverNodes.on('keydown', (event: any, d) => {
      if (event.key === 'Enter') highlight((d as any).id);
    });
    peerNodes.on('keydown', (event: any, d) => {
      if (event.key === 'Enter') highlight((d as any).id);
    });

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'topology-tooltip')
      .style('display', 'none')
      .style('position', 'absolute')
      .style('background', 'var(--bg-raised)')
      .style('border', '1px solid var(--border-strong)')
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('font-size', '13px')
      .style('color', 'var(--text-primary)')
      .style('pointer-events', 'none');

    allNodes.forEach((el) => {
      function showTooltip(event: MouseEvent | FocusEvent, d: unknown) {
        const node = d as GraphNode;
        tooltip
          .style('display', 'block')
          .style('left', `${(event instanceof FocusEvent ? 0 : (event as MouseEvent).offsetX) + 12}px`)
          .style('top', `${(event instanceof FocusEvent ? 0 : (event as MouseEvent).offsetY) - 10}px`)
          .text(`${node.name} (${node.type})${node.health ? ` — ${node.health}` : ''}`);
      }
      function hideTooltip() {
        tooltip.style('display', 'none');
      }
      d3.select(el)
        .on('mousemove', showTooltip)
        .on('focus', showTooltip)
        .on('mouseout', hideTooltip)
        .on('blur', hideTooltip);
    });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      serverNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      peerNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
      svg.on('.zoom', null);
      svg.selectAll('*').remove();
      tooltip.remove();
    };
  }, [servers, allPeers, dimensions]);

  useEffect(() => {
    const cleanup = renderGraph();
    return () => cleanup?.();
  }, [renderGraph]);

  if (sLoading || pLoading) {
    return <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading topology...</div>;
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
        Network topology — servers shown as hexagons, peers as circles. Hover to highlight connections. Scroll to zoom, drag to pan.
      </p>
      <div
        ref={containerRef}
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          height: 'calc(100vh - 160px)',
          minHeight: 400,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          role="application"
          aria-label={`Network topology: ${servers?.length ?? 0} servers, ${allPeers.length} peers. ${allPeers.filter(p => p.health === 'online').length} online, ${allPeers.filter(p => p.health === 'degraded').length} degraded, ${allPeers.filter(p => p.health === 'offline').length} offline.`}
          style={{ display: 'block' }}
          tabIndex={0}
        />
      </div>
    </div>
  );
}

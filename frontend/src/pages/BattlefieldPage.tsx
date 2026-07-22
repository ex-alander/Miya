import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  mentalMapService,
  type MentalMap,
  type MentalMapNode,
  type MentalMapWithNodes,
  type MasteryState,
} from "../services/mentalMap";
import { useToast } from "../components/ui/ToastProvider";
import { FireConfirmModal } from "../components/ui/FireConfirmModal";
import { Button } from "../components/ui/Button";
import { DeckList } from "../components/decks/DeckList";
import { CardList } from "../components/cards/CardList";
import { CardForm } from "../components/cards/CardForm";
import { Modal } from "../components/ui/Modal";
import { DeckForm } from "../components/decks/DeckForm";
import { Card } from "../components/ui/Card";
import type { Deck, DeckCreate, DeckUpdate, DeckStatus } from "../services/deck";
import { cardService, type Card as CardType, type CardCreate, type CardUpdate } from "../services/card";
import { deckService } from "../services/deck";
import { useApi } from "../hooks/useApi";
import { NewMapChoiceModal } from "../components/battlefield/NewMapChoiceModal";
import { AIGenerationModal } from "../components/battlefield/AIGenerationModal";
import {
  buildMapExportFile,
  downloadMapFile,
  parseMapImportFile,
} from "../utils/mapExport";
import "./BattlefieldPage.css";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 72;
const MAP_WIDTH = 15000;
const MAP_HEIGHT = 10000;
const REPARENT_ANIM_MS = 300;
const OVERLAP_PUSH = 20;
const OVERLAP_EASING_MS = 200;

// 🔥 ГЛОБАЛЬНЫЕ КОНСТАНТЫ ДЛЯ ЗУМА
const MIN_SCALE = 0.05;
const MAX_SCALE = 100.0;
const ZOOM_STEP = 0.15;

// 🔥 КОНСТАНТЫ ДЛЯ ВИЗУАЛЬНЫХ ИЗМЕНЕНИЙ
const MIN_NODE_SIZE = 0.6;
const MAX_NODE_SIZE = 2.0;
const MIN_LINE_WIDTH = 1;
const MAX_LINE_WIDTH = 8;

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function pushApart(
  positions: Map<number, { x: number; y: number }>,
  nodeA: number,
  nodeB: number,
  w: number,
  h: number,
  mapW: number,
  mapH: number
) {
  const pa = positions.get(nodeA)!;
  const pb = positions.get(nodeB)!;
  const ax = pa.x + w / 2;
  const ay = pa.y + h / 2;
  const bx = pb.x + w / 2;
  const by = pb.y + h / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const push = OVERLAP_PUSH;
  const na = { x: Math.max(0, Math.min(mapW - w, pa.x - nx * push)), y: Math.max(0, Math.min(mapH - h, pa.y - ny * push)) };
  const nb = { x: Math.max(0, Math.min(mapW - w, pb.x + nx * push)), y: Math.max(0, Math.min(mapH - h, pb.y + ny * push)) };
  positions.set(nodeA, na);
  positions.set(nodeB, nb);
}

const VIEWPORT_KEY = "battlefield_viewport";

type UndoAction =
  | { type: "add"; nodeId: number }
  | { type: "delete"; node: MentalMapNode }
  | { type: "move"; nodeId: number; prevX: number; prevY: number; prevParentId: number | null }
  | { type: "connect"; nodeId: number; prevParentId: number | null }
  | { type: "rename"; nodeId: number; prevTitle: string };

type NodePopupState = {
  nodeId: number;
  x: number;
  y: number;
};

type EditNodeDraft = {
  nodeId: number;
  title: string;
  description: string;
};

function computeDepthMap(nodes: MentalMapNode[]): Map<number, number> {
  const depth = new Map<number, number>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  function getDepth(node: MentalMapNode): number {
    if (depth.has(node.id)) return depth.get(node.id)!;
    const d = node.parent_id ? 1 + getDepth(byId.get(node.parent_id)!) : 0;
    depth.set(node.id, d);
    return d;
  }
  nodes.forEach((n) => getDepth(n));
  return depth;
}

function getDescendantIds(nodes: MentalMapNode[], rootId: number): Set<number> {
  const byParent = new Map<number, MentalMapNode[]>();
  nodes.forEach((n) => {
    const pid = n.parent_id ?? -1;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(n);
  });
  const out = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    const children = byParent.get(id) ?? [];
    children.forEach((c) => {
      out.add(c.id);
      stack.push(c.id);
    });
  }
  return out;
}

function getSubtreeNodes(nodes: MentalMapNode[], rootId: number): MentalMapNode[] {
  const ids = getDescendantIds(nodes, rootId);
  ids.add(rootId);
  return nodes.filter((n) => ids.has(n.id));
}

function getStars(mastery: MasteryState): number {
  if (mastery === "unconquered") return 0;
  if (mastery === "in_progress") return 1;
  return 3;
}

function nextMastery(mastery: MasteryState): MasteryState {
  if (mastery === "unconquered") return "in_progress";
  if (mastery === "in_progress") return "mastered";
  return "unconquered";
}

function loadViewport(mapId: number): { x: number; y: number; scale: number } | null {
  try {
    const raw = localStorage.getItem(`${VIEWPORT_KEY}_${mapId}`);
    if (raw) {
      const p = JSON.parse(raw);
      return { 
        x: p.x ?? 0, 
        y: p.y ?? 0, 
        scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, p.scale ?? 1)) 
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveViewport(mapId: number, x: number, y: number, scale: number) {
  try {
    localStorage.setItem(
      `${VIEWPORT_KEY}_${mapId}`,
      JSON.stringify({ x, y, scale })
    );
  } catch {
    /* ignore */
  }
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

// 🔥 ФУНКЦИЯ ДЛЯ ВЫЧИСЛЕНИЯ РАЗМЕРА УЗЛА НА ОСНОВЕ ГЛУБИНЫ
function getNodeSize(depth: number, maxDepth: number): number {
  if (maxDepth === 0) return 1.2;
  const normalizedDepth = depth / maxDepth;
  // От 1.2 (корень) до 0.7 (листья)
  return Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, 1.2 - normalizedDepth * 0.5));
}

// 🔥 ФУНКЦИЯ ДЛЯ ВЫЧИСЛЕНИЯ ТОЛЩИНЫ ЛИНИИ НА ОСНОВЕ ГЛУБИНЫ
function getLineWidth(depth: number, maxDepth: number): number {
  if (maxDepth === 0) return MAX_LINE_WIDTH;
  const normalizedDepth = depth / maxDepth;
  // От 6 (корень) до 1.5 (листья)
  return Math.max(MIN_LINE_WIDTH, Math.min(MAX_LINE_WIDTH, MAX_LINE_WIDTH - normalizedDepth * 5));
}

export default function BattlefieldPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const id = mapId ? parseInt(mapId, 10) : null;

  const [map, setMap] = useState<MentalMapWithNodes | null>(null);
  const [maps, setMaps] = useState<MentalMap[]>([]);
  const [treeData, setTreeData] = useState<MentalMapWithNodes[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarTreeMode, setSidebarTreeMode] = useState(false);
  const [tilesView, setTilesView] = useState(false);
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deckRefetchTrigger, setDeckRefetchTrigger] = useState(0);
  const [deckStatusMap, setDeckStatusMap] = useState<Record<number, DeckStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(5);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggingNode, setDraggingNode] = useState<MentalMapNode | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [editingNode, setEditingNode] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [reparentingNode, setReparentingNode] = useState<{
    nodeId: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; type: "node"; node: MentalMapNode }
    | { x: number; y: number; type: "canvas" }
    | null
  >(null);
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState("");
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [openDeckWorkspace, setOpenDeckWorkspace] = useState<{ deckId: number; deckTitle: string } | null>(null);
  const [deckWorkspaceView, setDeckWorkspaceView] = useState<"list" | "graph">("list");
  const [confirmModal, setConfirmModal] = useState<
    | {
        type: "deleteNode";
        node: MentalMapNode;
      }
    | {
    type: "deleteMap";
      }
    | null
  >(null);
  const [newMapFlow, setNewMapFlow] = useState<null | "choice">(null);
  const [emptyMapPromptOpen, setEmptyMapPromptOpen] = useState(false);
  const [aiGenerationOpen, setAiGenerationOpen] = useState(false);
  const [nodePopup, setNodePopup] = useState<NodePopupState | null>(null);
  const [editNodeDraft, setEditNodeDraft] = useState<EditNodeDraft | null>(null);
  const [enhanceNode, setEnhanceNode] = useState<MentalMapNode | null>(null);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const importMapInputRef = useRef<HTMLInputElement>(null);
  const didPanRef = useRef(false);
  const dragMovedRef = useRef(false);
  const nodeClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledStudyDeckRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const createDeckApi = useApi(deckService.create);
  const updateDeckApi = useApi(deckService.update);

  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [cardRefetchTrigger, setCardRefetchTrigger] = useState(0);

  const createCardApi = useApi(cardService.create);
  const updateCardApi = useApi(cardService.update);

  const handleCardFormSubmit = async (data: CardCreate | CardUpdate) => {
    if (!openDeckWorkspace) return;
    if (editingCard) {
      await updateCardApi.execute(editingCard.id, data);
    } else {
      await createCardApi.execute({ ...(data as CardCreate), deck_id: openDeckWorkspace.deckId });
    }
    setShowCardForm(false);
    setEditingCard(null);
    setCardRefetchTrigger((t) => t + 1);
  };

  const handleDeckFormSubmit = async (data: DeckCreate | DeckUpdate) => {
    if (editingDeck) {
      await updateDeckApi.execute(editingDeck.id, data);
    } else {
      await createDeckApi.execute(data);
    }
    setShowDeckForm(false);
    setEditingDeck(null);
    setDeckRefetchTrigger((t) => t + 1);
  };

  const refreshDeckStatuses = useCallback(
    async (deckIds: number[]) => {
      const uniq = Array.from(new Set(deckIds)).filter((d) => Number.isFinite(d));
      if (uniq.length === 0) return;
      try {
        const results = await Promise.all(
          uniq.map(async (deckId) => ({
            deckId,
            status: await deckService.getStatus(deckId),
          }))
        );
        const next: Record<number, DeckStatus> = {};
        results.forEach(({ deckId, status }) => {
          next[deckId] = status;
        });
        setDeckStatusMap(next);
      } catch {
        // Status highlighting is non-critical; ignore failures.
      }
    },
    [setDeckStatusMap]
  );

  const loadMap = useCallback(async () => {
    if (!id) {
      try {
        const mapsRes = await mentalMapService.list();
        setMaps(mapsRes);
        if (mapsRes.length > 0) {
          navigate(`/battlefield/${mapsRes[0].id}`, { replace: true });
          return;
        }
        const created = await mentalMapService.create({});
        navigate(`/battlefield/${created.id}`, { replace: true });
        return;
      } catch (e) {
        setError("Failed to load maps");
        setLoading(false);
        return;
      }
    }
    try {
      setError(null);
      const [data, mapsRes] = await Promise.all([
        mentalMapService.getWithNodes(id),
        mentalMapService.list(),
      ]);
      setMap(data);
      setMaps(mapsRes);

      const deckIds = data.nodes
        .filter((n) => (n.node_type ?? "simple") === "deck" && n.deck_id)
        .map((n) => n.deck_id as number);
      void refreshDeckStatuses(deckIds);

      const depthMap = computeDepthMap(data.nodes);
      const maxD = Math.max(0, ...depthMap.values());
      setLevel((l) => Math.min(l, maxD));
      
      const saved = loadViewport(id);
      if (saved) {
        setTransform(saved);
      } else {
        setTransform({ x: 0, y: 0, scale: 1 });
      }
    } catch (e) {
      setError("Failed to load map");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, refreshDeckStatuses]);

  useEffect(() => {
    loadMap();
    hasCenteredRef.current = false;
  }, [loadMap]);

  const centerOnRoot = useCallback(() => {
    if (!map || !containerRef.current || hasCenteredRef.current) return;

    const rootNode = map.nodes.find(n => n.parent_id === null);
    if (!rootNode) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const targetScale = 1.2;
    const newX = rect.width / 2 - rootNode.x * targetScale;
    const newY = rect.height / 2 - rootNode.y * targetScale;

    setTransform({
      scale: targetScale,
      x: newX,
      y: newY,
    });
    hasCenteredRef.current = true;
  }, [map, containerRef]);

  useEffect(() => {
    if (!map || !containerRef.current) return;
    const timer = setTimeout(() => centerOnRoot(), 100);
    return () => clearTimeout(timer);
  }, [map, containerRef, centerOnRoot]);

  useEffect(() => {
    const state = location.state as
      | { studyCompleted?: boolean; deckId?: number }
      | undefined;
    const deckId = typeof state?.deckId === "number" ? state.deckId : null;
    if (!state?.studyCompleted || !deckId) return;
    if (lastHandledStudyDeckRef.current === deckId) return;
    lastHandledStudyDeckRef.current = deckId;
    refreshDeckStatuses([deckId]);
  }, [location.state, refreshDeckStatuses]);

  useEffect(() => {
    if (sidebarTreeMode) {
      mentalMapService.getTree().then(setTreeData).catch(() => setTreeData([]));
    }
  }, [sidebarTreeMode]);

  useEffect(() => {
    if (!id || !map) return;
    const t = setTimeout(() => saveViewport(id, transform.x, transform.y, transform.scale), 300);
    return () => clearTimeout(t);
  }, [id, map, transform]);

  const depthMap = map ? computeDepthMap(map.nodes) : new Map<number, number>();
  const maxDepth = map ? Math.max(0, ...Array.from(depthMap.values())) : 0;
  const visibleNodes = map ? map.nodes.filter((n) => depthMap.get(n.id)! <= level) : [];
  const nodeById = new Map(map?.nodes.map((n) => [n.id, n]) ?? []);

  const screenToMap = useCallback(
    (clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el) return { x: 0, y: 0 };
      const pt = el.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = el.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const svgP = pt.matrixTransform(ctm.inverse());
      const localX = (svgP.x - transform.x) / transform.scale;
      const localY = (svgP.y - transform.y) / transform.scale;
      return { x: localX, y: localY };
    },
    [transform]
  );

  const getViewCenter = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return screenToMap(cx, cy);
  }, [screenToMap]);

  const createNodeAt = useCallback(
    (x: number, y: number, parentId?: number | null, openEditor = true, isDeck = false) => {
      if (!map) return;
      const title = isDeck ? "New Deck" : "New Territory";
      mentalMapService
        .createNode(map.id, {
          title,
          x: Math.max(0, Math.min(MAP_WIDTH - NODE_WIDTH, x - NODE_WIDTH / 2)),
          y: Math.max(0, Math.min(MAP_HEIGHT - NODE_HEIGHT, y - NODE_HEIGHT / 2)),
          parent_id: parentId ?? undefined,
          node_type: isDeck ? "deck" : "simple",
        })
        .then((created) => {
          loadMap();
          setUndoStack((s) => [...s, { type: "add", nodeId: created.id }]);
          if (openEditor) {
            setTimeout(() => {
              setEditingNode(created.id);
              setEditTitle(title);
            }, 50);
          }
        })
        .catch((e: { response?: { data?: { detail?: string } } }) => {
          const msg = e.response?.data?.detail ?? "Failed to create node";
          showToast(msg, "error");
        });
    },
    [map, loadMap, showToast]
  );

  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    if (didPanRef.current) return;
    const t = e.target as SVGElement;
    if (t?.classList?.contains("battlefield-bg") && map) {
      const pt = screenToMap(e.clientX, e.clientY);
      createNodeAt(pt.x, pt.y, null, true);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    const t = e.target as SVGElement;
    if (t?.classList?.contains("battlefield-bg")) {
      setSelectedId(null);
      setContextMenu(null);
      setNodePopup(null);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!map) return;
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === "n") {
        e.preventDefault();
        const center = getViewCenter();
        createNodeAt(center.x, center.y, null, true);
        return;
      }
      if (mod && e.key === "z") {
        e.preventDefault();
        const last = undoStack[undoStack.length - 1];
        if (!last) return;
        setUndoStack((s) => s.slice(0, -1));
        if (last.type === "add") {
          mentalMapService.deleteNode(map.id, last.nodeId).then(() => loadMap());
        } else if (last.type === "delete") {
          mentalMapService
            .createNode(map.id, {
              title: last.node.title,
              description: last.node.description ?? undefined,
              x: last.node.x,
              y: last.node.y,
              parent_id: last.node.parent_id,
              mastery_state: last.node.mastery_state as MasteryState,
              node_type: last.node.node_type ?? "simple",
              source_ref: last.node.source_ref ?? undefined,
            })
            .then(() => loadMap());
        } else if (last.type === "move") {
          mentalMapService
            .updateNode(map.id, last.nodeId, {
              x: last.prevX,
              y: last.prevY,
              parent_id: last.prevParentId,
            })
            .then(() => loadMap());
        } else if (last.type === "connect") {
          mentalMapService
            .updateNode(map.id, last.nodeId, { parent_id: last.prevParentId })
            .then(() => loadMap());
        } else if (last.type === "rename") {
          mentalMapService
            .updateNode(map.id, last.nodeId, { title: last.prevTitle })
            .then(() => loadMap());
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedId && !editingNode) {
          e.preventDefault();
          const node = nodeById.get(selectedId);
          if (node) confirmDeleteNode(node);
        }
        return;
      }
      if (e.key === "Enter" && selectedId && !editingNode) {
        e.preventDefault();
        setEditTitle(nodeById.get(selectedId)?.title ?? "");
        setEditingNode(selectedId);
        return;
      }
      if (e.key === "Escape") {
        setEditingNode(null);
        setContextMenu(null);
        setNodePopup(null);
      }
    },
    [
      map,
      selectedId,
      editingNode,
      undoStack,
      nodeById,
      getViewCenter,
      createNodeAt,
      loadMap,
      showToast,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleNodePointerDown = (e: React.PointerEvent, node: MentalMapNode) => {
    e.stopPropagation();
    if (
      (e.target as HTMLElement).closest("input") ||
      (e.target as HTMLElement).closest("button")
    )
      return;
    dragMovedRef.current = false;
    if (nodeClickTimerRef.current) {
      clearTimeout(nodeClickTimerRef.current);
      nodeClickTimerRef.current = null;
    }
    setSelectedId(node.id);
    const pt = screenToMap(e.clientX, e.clientY);
    setDraggingNode(node);
    setDragOffset({ dx: pt.x - node.x, dy: pt.y - node.y });
    setDragPos({ x: node.x, y: node.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (panning && containerRef.current) {
        didPanRef.current = true;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setTransform((prev) => ({
          ...prev,
          x: prev.x + 7.2* dx,
          y: prev.y + 7.2*dy,
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }
      if (draggingNode && map) {
        const pt = screenToMap(e.clientX, e.clientY);
        const nx = pt.x - dragOffset.dx;
        const ny = pt.y - dragOffset.dy;
        setDragPos({ x: nx, y: ny });

        if (!dragMovedRef.current) {
          const moved = Math.hypot(nx - draggingNode.x, ny - draggingNode.y) > 3;
          if (moved) dragMovedRef.current = true;
        }

        const under = visibleNodes.find(
          (n) =>
            n.id !== draggingNode.id &&
            nx + NODE_WIDTH / 2 >= n.x &&
            nx + NODE_WIDTH / 2 <= n.x + NODE_WIDTH &&
            ny + NODE_HEIGHT / 2 >= n.y &&
            ny + NODE_HEIGHT / 2 <= n.y + NODE_HEIGHT
        );

        if (under) {
          const descendants = getDescendantIds(map.nodes, draggingNode.id);
          if (descendants.has(under.id)) {
            setDropTarget(null);
          } else {
            setDropTarget(under.id);
          }
        } else {
          setDropTarget(null);
        }
      }
    },
    [panning, panStart, draggingNode, dragOffset, map, visibleNodes, screenToMap]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (panning) {
        setPanning(false);
        return;
      }
      if (draggingNode && map) {
        const pt = screenToMap(e.clientX, e.clientY);
        const nx = pt.x - dragOffset.dx;
        const ny = pt.y - dragOffset.dy;

        const under = visibleNodes.find(
          (n) =>
            n.id !== draggingNode.id &&
            nx + NODE_WIDTH / 2 >= n.x &&
            nx + NODE_WIDTH / 2 <= n.x + NODE_WIDTH &&
            ny + NODE_HEIGHT / 2 >= n.y &&
            ny + NODE_HEIGHT / 2 <= n.y + NODE_HEIGHT
        );

        const descendants = getDescendantIds(map.nodes, draggingNode.id);
        const wouldCycle = under ? descendants.has(under.id) : false;

        if (under && !wouldCycle) {
          mentalMapService
            .updateNode(map.id, draggingNode.id, { parent_id: under.id })
            .then(() => {
              setUndoStack((s) => [...s, { type: "connect", nodeId: draggingNode.id, prevParentId: draggingNode.parent_id }]);
              setReparentingNode({
                nodeId: draggingNode.id,
                fromX: nx,
                fromY: ny,
                toX: draggingNode.x,
                toY: draggingNode.y,
              });
              setDraggingNode(null);
              setDropTarget(null);
              setDragPos(null);
              setTimeout(() => {
                setReparentingNode(null);
                loadMap();
              }, REPARENT_ANIM_MS);
            })
            .catch((err: { response?: { data?: { detail?: string } } }) => {
              showToast(err.response?.data?.detail ?? "Cannot attach", "error");
              setDraggingNode(null);
              setDropTarget(null);
              setDragPos(null);
            });
        } else if (wouldCycle) {
          setDraggingNode(null);
          setDropTarget(null);
          setDragPos(null);
        } else {
          let fx = Math.max(0, Math.min(MAP_WIDTH - NODE_WIDTH, nx));
          let fy = Math.max(0, Math.min(MAP_HEIGHT - NODE_HEIGHT, ny));
          const positions = new Map(
            map.nodes.map((n) => [
              n.id,
              {
                x: n.id === draggingNode.id ? fx : n.x,
                y: n.id === draggingNode.id ? fy : n.y,
              },
            ])
          );
          for (let iter = 0; iter < 15; iter++) {
            let any = false;
            for (const a of map.nodes) {
              for (const b of map.nodes) {
                if (a.id >= b.id) continue;
                const pa = positions.get(a.id)!;
                const pb = positions.get(b.id)!;
                if (
                  rectsOverlap(
                    { x: pa.x, y: pa.y, w: NODE_WIDTH, h: NODE_HEIGHT },
                    { x: pb.x, y: pb.y, w: NODE_WIDTH, h: NODE_HEIGHT }
                  )
                ) {
                  pushApart(positions, a.id, b.id, NODE_WIDTH, NODE_HEIGHT, MAP_WIDTH, MAP_HEIGHT);
                  any = true;
                }
              }
            }
            if (!any) break;
          }
          const final = positions.get(draggingNode.id)!;
          const updates: Promise<unknown>[] = [
            mentalMapService.updateNode(map.id, draggingNode.id, {
              parent_id: draggingNode.parent_id,
              x: final.x,
              y: final.y,
            }),
          ];
          for (const n of map.nodes) {
            if (n.id === draggingNode.id) continue;
            const p = positions.get(n.id)!;
            if (p.x !== n.x || p.y !== n.y) {
              updates.push(mentalMapService.updateNode(map.id, n.id, { x: p.x, y: p.y }));
            }
          }
          Promise.all(updates).then(() => {
            loadMap();
            setUndoStack((s) => [
              ...s,
              {
                type: "move",
                nodeId: draggingNode.id,
                prevX: draggingNode.x,
                prevY: draggingNode.y,
                prevParentId: draggingNode.parent_id,
              },
            ]);
          });
          setDraggingNode(null);
          setDropTarget(null);
          setDragPos(null);
        }
      }
    },
    [panning, draggingNode, map, dragOffset, visibleNodes, screenToMap, loadMap, showToast]
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

    setTransform((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta));
      const mouseWorldX = (mouseX - prev.x) / prev.scale;
      const mouseWorldY = (mouseY - prev.y) / prev.scale;
      return {
        scale: newScale,
        x: mouseX - mouseWorldX * newScale,
        y: mouseY - mouseWorldY * newScale,
      };
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
  
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef.current, handleWheel]);

  const zoomBy = (delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mouseX = rect.width / 2;
    const mouseY = rect.height / 2;
    setTransform((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta));
      const mouseWorldX = (mouseX - prev.x) / prev.scale;
      const mouseWorldY = (mouseY - prev.y) / prev.scale;
      return {
        scale: newScale,
        x: mouseX - mouseWorldX * newScale,
        y: mouseY - mouseWorldY * newScale,
      };
    });
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (e.button === 0 && (t?.classList?.contains("battlefield-bg") || t?.closest(".battlefield-bg"))) {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const t = e.target as SVGElement;
    if (t?.classList?.contains("battlefield-bg")) {
      setNodePopup(null);
      setContextMenu({ x: e.clientX, y: e.clientY, type: "canvas" });
    }
  };

  const updateNodeTitle = (node: MentalMapNode, title: string) => {
    if (!map) return;
    const prev = node.title;
    if (!title.trim()) {
      setEditingNode(null);
      return;
    }
    mentalMapService
      .updateNode(map.id, node.id, { title: title.trim() })
      .then(() => {
        loadMap();
        setUndoStack((s) => [...s, { type: "rename", nodeId: node.id, prevTitle: prev }]);
      })
      .finally(() => setEditingNode(null));
  };

  const confirmDeleteNode = (node: MentalMapNode) => {
    setConfirmModal({ type: "deleteNode", node });
  };

  const doDeleteNode = (node: MentalMapNode) => {
    if (!map) return;
    setConfirmModal(null);
    setUndoStack((s) => [...s, { type: "delete", node }]);
    mentalMapService
      .deleteNode(map.id, node.id)
      .then(() => {
        loadMap();
        setSelectedId(null);
      })
      .catch(() => showToast("Failed to delete", "error"));
  };

  const handleSaveNodeDetails = async () => {
    if (!map || !editNodeDraft) return;
    const title = editNodeDraft.title.trim();
    if (!title) {
      showToast("Node title cannot be empty", "error");
      return;
    }
    try {
      await mentalMapService.updateNode(map.id, editNodeDraft.nodeId, {
        title,
        description: editNodeDraft.description.trim() || null,
      });
      setEditNodeDraft(null);
      await loadMap();
      setNodePopup((prev) =>
        prev && prev.nodeId === editNodeDraft.nodeId ? { ...prev, nodeId: editNodeDraft.nodeId } : prev
      );
    } catch {
      showToast("Failed to update node", "error");
    }
  };

  const handleEnhanceNode = async () => {
    if (!map || !enhanceNode || !enhancePrompt.trim()) return;
    setEnhanceLoading(true);
    try {
      await mentalMapService.enhanceNode(map.id, enhanceNode.id, {
        prompt: enhancePrompt.trim(),
      });
      setEnhanceNode(null);
      setEnhancePrompt("");
      await loadMap();
      showToast("Node enhanced successfully", "success");
    } catch {
      showToast("Failed to enhance node", "error");
    } finally {
      setEnhanceLoading(false);
    }
  };

  const handleStudyBranch = async (rootNode: MentalMapNode) => {
    if (!map) return;
    const subtree = getSubtreeNodes(map.nodes, rootNode.id);
    if (subtree.length === 0) {
      showToast("Branch is empty", "error");
      return;
    }
    try {
      const deck = await deckService.create({
        title: `Branch: ${rootNode.title}`.slice(0, 120),
        description: "Temporary deck for studying map branch",
        is_public: false,
      });
      await cardService.createBulk({
        deck_id: deck.id,
        items: subtree.map((n, index) => ({
          front_content: n.title,
          back_content: (n.description ?? "").trim() || "No description",
          order_index: index,
        })),
      });
      navigate(`/study/${deck.id}`);
      setContextMenu(null);
      setNodePopup(null);
    } catch {
      showToast("Failed to start branch study", "error");
    }
  };

  const handleNodeClick = (node: MentalMapNode) => {
    if (dragMovedRef.current) return;

    if (nodeClickTimerRef.current) clearTimeout(nodeClickTimerRef.current);
    nodeClickTimerRef.current = window.setTimeout(() => {
      if (dragMovedRef.current) return;
      const host = containerRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const rawX =
        rect.left + transform.x + (node.x + NODE_WIDTH) * transform.scale + 12;
      const rawY =
        rect.top + transform.y + node.y * transform.scale + 8;
      const maxX = window.innerWidth - 340;
      const maxY = window.innerHeight - 240;
      const clampedX = Math.max(12, Math.min(maxX, rawX));
      const clampedY = Math.max(12, Math.min(maxY, rawY));
      setSelectedId(node.id);
      setNodePopup({ nodeId: node.id, x: clampedX, y: clampedY });
      setContextMenu(null);
      setEditingNode(null);
    }, 220);
  };

  const handleNodeDoubleClick = (
    e: React.MouseEvent,
    node: MentalMapNode
  ) => {
    if (nodeClickTimerRef.current) clearTimeout(nodeClickTimerRef.current);
    nodeClickTimerRef.current = null;

    e.stopPropagation();
    const t = e.target as SVGElement;
    if (t?.closest?.("input")) {
      return;
    }

    const isDeck = (node.node_type ?? "simple") === "deck";
    if (isDeck && node.deck_id && map) {
      navigate(`/study/${node.deck_id}`, {
        state: { fromBattlefield: true, mapId: map.id, deckId: node.deck_id },
      });
      return;
    }
    confirmDeleteNode(node);
  };

  const cycleMastery = (node: MentalMapNode) => {
    if (!map) return;
    mentalMapService
      .updateNode(map.id, node.id, { mastery_state: nextMastery(node.mastery_state) })
      .then(() => loadMap());
  };

  const handleUpdateMapTitle = () => {
    if (!map) return;
    const title = newMapTitle.trim() || map.title;
    mentalMapService
      .update(map.id, { title })
      .then(() => {
        loadMap();
        setMapSettingsOpen(false);
        setNewMapTitle("");
      });
  };

  const doDeleteMap = async () => {
    if (!map) return;
    try {
      await mentalMapService.delete(map.id);
      setConfirmModal(null);
      const remaining = await mentalMapService.list();
      setMaps(remaining);
      if (remaining.length > 0) {
        navigate(`/battlefield/${remaining[0].id}`);
      } else {
        const created = await mentalMapService.create({});
        navigate(`/battlefield/${created.id}`);
      }
    } catch {
      showToast("Failed to delete map", "error");
    }
  };

  if (loading) {
    return (
      <div className="battlefield-page">
        <div className="battlefield-loading">Loading battlefield...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="battlefield-page">
        <div className="battlefield-error">{error}</div>
      </div>
    );
  }

  if (!map && !tilesView) return null;

  const displayNodes = visibleNodes.map((node) => {
    const isDragging = draggingNode?.id === node.id;
    const isReparenting = reparentingNode?.nodeId === node.id;
    let pos = { x: node.x, y: node.y };
    if (isDragging && dragPos) pos = dragPos;
    else if (isReparenting && reparentingNode) pos = { x: reparentingNode.toX, y: reparentingNode.toY };
    return { ...node, displayX: pos.x, displayY: pos.y, isReparenting };
  });

  const sidebarEl = (
    <>
      <button
        type="button"
        className="battlefield-sidebar-hamburger"
        onClick={() => setSidebarCollapsed((c) => !c)}
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
      >
        <span /><span /><span />
      </button>
      <aside className={`battlefield-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="battlefield-sidebar-header">
          <button type="button" className={`battlefield-sidebar-expand ${sidebarTreeMode ? "active" : ""}`} onClick={() => setSidebarTreeMode((t) => !t)} title="Deck tree">🌳</button>
          <button type="button" className="battlefield-sidebar-gear" onClick={() => setMapSettingsOpen(true)} title="Settings">⚙</button>
          <button type="button" className="battlefield-sidebar-tiles" onClick={() => setTilesView(true)} title="Tiles view">⊞</button>
          <button type="button" className="battlefield-sidebar-newmap" onClick={() => setNewMapFlow("choice")} title="New map">+</button>
        </div>
      {!sidebarCollapsed && (
        <div className="battlefield-sidebar-content">
          {sidebarTreeMode ? (
            <div className="battlefield-sidebar-tree">
              {treeData.map((m) => {
                const deckNodes = m.nodes.filter((n) => (n.node_type ?? "simple") === "deck");
                const byParent = new Map<number | null, MentalMapNode[]>();
                deckNodes.forEach((n) => {
                  const pid = n.parent_id;
                  if (!byParent.has(pid)) byParent.set(pid, []);
                  byParent.get(pid)!.push(n);
                });
                const renderDeckNode = (node: MentalMapNode, depth: number) => (
                  <div key={node.id} className="battlefield-tree-deck-wrap" style={{ paddingLeft: depth * 14 }}>
                    <button type="button" className="battlefield-tree-deck" onClick={() => node.deck_id && navigate(`/decks/${node.deck_id}`)}>
                      🃏 {node.title}
                    </button>
                    {(byParent.get(node.id) ?? []).map((child) => renderDeckNode(child, depth + 1))}
                  </div>
                );
                const rootDecks = byParent.get(null) ?? [];
                return (
                  <div key={m.id} className="battlefield-tree-map">
                    <button type="button" className={`battlefield-tree-item ${id === m.id ? "selected" : ""}`} onClick={() => { navigate(`/battlefield/${m.id}`); setTilesView(false); }}>
                      📚 {m.title}
                    </button>
                    {rootDecks.map((n) => renderDeckNode(n, 0))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="battlefield-sidebar-maps">
              {maps.map((m) => (
                <button key={m.id} type="button" className={`battlefield-sidebar-map ${id === m.id ? "selected" : ""}`} onClick={() => { navigate(`/battlefield/${m.id}`); setTilesView(false); }}>
                  <span className="battlefield-sidebar-map-icon">🏯</span>
                  <span className="battlefield-sidebar-map-title">{m.title}</span>
                  <span className="battlefield-sidebar-map-date">{formatRelativeTime(m.updated_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      </aside>
    </>
  );

  return (
    <div className="battlefield-page battlefield-layout">
      {sidebarEl}
      <main className="battlefield-main">
        {tilesView ? (
          showDeckForm ? (
            <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
              <div className="battlefield-tiles-toolbar">
                <Button variant="ghost" size="sm" onClick={() => { setShowDeckForm(false); setEditingDeck(null); }}>← Back</Button>
              </div>
              <Card dark>
                <DeckForm deck={editingDeck} onSubmit={handleDeckFormSubmit} onCancel={() => { setShowDeckForm(false); setEditingDeck(null); }} loading={createDeckApi.loading || updateDeckApi.loading} error={createDeckApi.error || updateDeckApi.error} />
              </Card>
            </div>
          ) : (
          <>
            <div className="battlefield-tiles-toolbar">
              <Button variant="ghost" size="sm" onClick={() => setTilesView(false)}>← Graph</Button>
            </div>
            <div className="battlefield-tiles-container">
              <DeckList
                onCreateClick={() => { setEditingDeck(null); setShowDeckForm(true); }}
                onEditClick={(d) => { setEditingDeck(d); setShowDeckForm(true); }}
                onDeckClick={(d) => navigate(`/decks/${d.id}`)}
                onStudyClick={(d) => navigate(`/study/${d.id}`)}
                refetchTrigger={deckRefetchTrigger}
              />
            </div>
          </>
          )
        ) : (
          <>
      <div className="battlefield-toolbar">
        <h1 className="battlefield-title">{map!.title}</h1>
      </div>

      <div
        ref={containerRef}
        className="battlefield-container"
        onPointerDown={handleBackgroundPointerDown}
      >
        <svg
          ref={svgRef}
          className="battlefield-svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={handleBackgroundClick}
          onDoubleClick={handleBackgroundDoubleClick}
          onContextMenu={(e) => { e.preventDefault(); handleBackgroundContextMenu(e); }}
        >
          <g
            className="battlefield-transform"
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
          >
            <rect
              className="battlefield-bg"
              x={0}
              y={0}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
            />

            <g className="battlefield-connections">
              {displayNodes
                .filter((n) => n.parent_id && nodeById.has(n.parent_id))
                .map((n) => {
                  const parent = nodeById.get(n.parent_id!);
                  if (!parent) return null;
                  const px = draggingNode?.id === parent.id && dragPos ? dragPos.x : parent.x;
                  const py = draggingNode?.id === parent.id && dragPos ? dragPos.y : parent.y;
                  const x1 = px + NODE_WIDTH / 2;
                  const y1 = py + NODE_HEIGHT;
                  const x2 = n.displayX + NODE_WIDTH / 2;
                  const y2 = n.displayY;
                  
                  // 🔥 ВЫЧИСЛЯЕМ ТОЛЩИНУ ЛИНИИ НА ОСНОВЕ ГЛУБИНЫ
                  const parentDepth = depthMap.get(parent.id) ?? 0;
                  const lineWidth = getLineWidth(parentDepth, maxDepth);
                  
                  return (
                    <line
                      key={`edge-${n.id}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      strokeWidth={lineWidth}
                      className={`battlefield-edge ${dropTarget === n.id ? "active" : ""}`}
                    />
                  );
                })}
            </g>

            {displayNodes.map((node) => {
              const isDropTarget = dropTarget === node.id;
              const isDragging = draggingNode?.id === node.id;
              const isSelected = selectedId === node.id;
              const stars = getStars(node.mastery_state);
              const isFaded = draggingNode && !isDragging && !isDropTarget;
              const deckStatus = node.deck_id ? deckStatusMap[node.deck_id] : undefined;
              const deckStatusClass =
                (node.node_type ?? "simple") === "deck"
                  ? deckStatus?.is_due
                    ? "deck-due"
                    : deckStatus?.is_mastered
                      ? "deck-mastered"
                      : ""
                  : "";
              
              // 🔥 ВЫЧИСЛЯЕМ РАЗМЕР УЗЛА НА ОСНОВЕ ГЛУБИНЫ
              const nodeDepth = depthMap.get(node.id) ?? 0;
              const sizeMultiplier = getNodeSize(nodeDepth, maxDepth);
              const scaledWidth = NODE_WIDTH * sizeMultiplier;
              const scaledHeight = NODE_HEIGHT * sizeMultiplier;
              const fontSize = Math.max(9, Math.min(14, 11 * sizeMultiplier));

              // 🔥 НОВЫЙ КОД - ВЫЧИСЛЯЕМ ЦВЕТ НА ОСНОВЕ ГЛУБИНЫ
              const maxDepthForColor = Math.max(1, maxDepth);
              const depthRatio = nodeDepth / maxDepthForColor;
              // От темно-красного (корень) к текущему цвету (листья)
              const r = Math.round(35 + (220 - 35) * depthRatio);
              const g = Math.round(18 + (18 - 18) * depthRatio);
              const b = Math.round(12 + (12 - 12) * depthRatio);
              const nodeColor = `rgba(${r}, ${g}, ${b}, 0.95)`;

              return (
                <g
                  key={node.id}
                  className={`battlefield-node ${node.mastery_state} ${isDragging ? "dragging" : ""} ${isDropTarget ? "drop-target" : ""} ${isSelected ? "selected" : ""} ${isFaded ? "faded" : ""} ${editingNode === node.id ? "editing" : ""} ${(node as { isReparenting?: boolean }).isReparenting ? "reparenting" : ""} ${deckStatusClass}`}
                  transform={`translate(${node.displayX}, ${node.displayY})`}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(node);
                  }}
                  onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNodePopup(null);
                    setContextMenu({ x: e.clientX, y: e.clientY, type: "node", node });
                  }}
                >
                  <rect 
                    x={3} 
                    y={3} 
                    width={scaledWidth} 
                    height={scaledHeight} 
                    rx={4} 
                    className="battlefield-node-shadow" 
                  />
                  <rect 
                    width={scaledWidth} 
                    height={scaledHeight} 
                    rx={4} 
                    className="battlefield-node-rect" 
                    fill={nodeColor}
                  />
                  {editingNode === node.id ? (
                    <foreignObject x={4} y={8} width={scaledWidth - 8} height={24}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => updateNodeTitle(node, editTitle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateNodeTitle(node, editTitle);
                          if (e.key === "Escape") setEditingNode(null);
                        }}
                        autoFocus
                        className="battlefield-node-input"
                        style={{ fontSize: `${fontSize}px` }}
                      />
                    </foreignObject>
                  ) : (
                    <foreignObject x={4} y={8} width={scaledWidth - 8} height={scaledHeight - 16}>
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          fontSize: `${fontSize}px`,
                          fontWeight: 600,
                          color: 'white',
                          padding: '4px',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                        }}
                      >
                        {node.title}
                        {(node.node_type ?? "simple") === "deck" && " 🃏"}
                      </div>
                    </foreignObject>
                  )}
                  <text
                    x={scaledWidth / 2}
                    y={scaledHeight - 8}
                    textAnchor="middle"
                    className="battlefield-node-stars"
                    style={{ fontSize: `${Math.max(8, 10 * sizeMultiplier)}px` }}
                    onClick={(e) => {
                      if ((node.node_type ?? "simple") === "deck") return;
                      e.stopPropagation();
                      cycleMastery(node);
                    }}
                  >
                    {"★".repeat(stars)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="battlefield-zoom-controls">
          <button type="button" className="battlefield-zoom-btn" onClick={() => zoomBy(ZOOM_STEP)} title="Zoom in">+</button>
          <button type="button" className="battlefield-zoom-btn" onClick={() => zoomBy(-ZOOM_STEP)} title="Zoom out">−</button>
          <div className="battlefield-zoom-indicator">
            
          </div>
          <div className="battlefield-depth-vertical">
            <input
              type="range"
              min={0}
              max={maxDepth}
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value, 10))}
              className="battlefield-depth-slider"
              title="Depth"
            />
            <span className="battlefield-depth-label">{level}</span>
          </div>
        </div>
      </div>

      {nodePopup && (() => {
        const popupNode = nodeById.get(nodePopup.nodeId);
        if (!popupNode) return null;
        return (
          <div
            className="battlefield-node-popup"
            style={{ left: nodePopup.x, top: nodePopup.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="battlefield-node-popup-header">
              <h4>{popupNode.title}</h4>
              <button type="button" onClick={() => setNodePopup(null)} aria-label="Close">
                ×
              </button>
            </div>
            <p>{popupNode.description?.trim() || "No description"}</p>
          </div>
        );
      })()}

      {contextMenu && (
        <>
          <div
            className="battlefield-context-overlay"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="battlefield-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onKeyDown={(e) => { if (e.key === "Escape") setContextMenu(null); }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {contextMenu.type === "canvas" ? (
              <>
                <button
                  onClick={() => {
                    const pt = screenToMap(contextMenu.x, contextMenu.y);
                    createNodeAt(pt.x, pt.y, null, true, false);
                    setContextMenu(null);
                  }}
                >
                  New Territory
                </button>
                <button
                  onClick={() => {
                    const pt = screenToMap(contextMenu.x, contextMenu.y);
                    createNodeAt(pt.x, pt.y, null, true, true);
                    setContextMenu(null);
                  }}
                >
                  Add Deck Node
                </button>
              </>
            ) : (
              <>
                {(contextMenu.node.node_type ?? "simple") === "deck" && contextMenu.node.deck_id && (
                  <button
                    onClick={() => {
                      setOpenDeckWorkspace({ deckId: contextMenu.node.deck_id!, deckTitle: contextMenu.node.title });
                      setContextMenu(null);
                    }}
                  >
                    Open Deck
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditNodeDraft({
                      nodeId: contextMenu.node.id,
                      title: contextMenu.node.title,
                      description: contextMenu.node.description ?? "",
                    });
                    setContextMenu(null);
                  }}
                >
                  Edit Node
                </button>
                <button
                  onClick={() => {
                    void handleStudyBranch(contextMenu.node);
                  }}
                >
                  Study Branch
                </button>
                <button
                  onClick={() => {
                    setEnhanceNode(contextMenu.node);
                    setEnhancePrompt("");
                    setContextMenu(null);
                  }}
                >
                  Enhance Node
                </button>
                <button
                  onClick={() => {
                    confirmDeleteNode(contextMenu.node);
                    setContextMenu(null);
                  }}
                  className="danger"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    createNodeAt(
                      contextMenu.node.x + NODE_WIDTH + 20,
                      contextMenu.node.y,
                      contextMenu.node.id,
                      true,
                      false
                    );
                    setContextMenu(null);
                  }}
                >
                  Add Child Node
                </button>
                <button
                  onClick={() => {
                    createNodeAt(
                      contextMenu.node.x + NODE_WIDTH + 20,
                      contextMenu.node.y,
                      contextMenu.node.id,
                      true,
                      true
                    );
                    setContextMenu(null);
                  }}
                >
                  Add Deck Node
                </button>
                <button disabled title="Coming in a later slice">
                  Cut
                </button>
                <button disabled title="Coming in a later slice">
                  Copy
                </button>
                <button disabled title="Coming in a later slice">
                  Paste
                </button>
              </>
            )}
          </div>
        </>
      )}

      {openDeckWorkspace && (
        <div className="battlefield-deck-workspace-overlay">
          <div className="battlefield-deck-workspace-dim" onClick={() => setOpenDeckWorkspace(null)} />
          <div className="battlefield-deck-workspace">
            <div className="battlefield-deck-workspace-header">
              <button type="button" className="battlefield-deck-workspace-back" onClick={() => setOpenDeckWorkspace(null)}>
                ← Back to battlefield
              </button>
              <h2 className="battlefield-deck-workspace-title">{openDeckWorkspace.deckTitle}</h2>
              <div className="battlefield-deck-workspace-toggles">
                <button type="button" className={deckWorkspaceView === "list" ? "active" : ""} onClick={() => setDeckWorkspaceView("list")}>List</button>
                <button type="button" className={deckWorkspaceView === "graph" ? "active" : ""} onClick={() => setDeckWorkspaceView("graph")}>Graph</button>
              </div>
              <button
                type="button"
                className="battlefield-deck-workspace-study"
                onClick={() => {
                  if (!map) return;
                  navigate(`/study/${openDeckWorkspace.deckId}`, {
                    state: {
                      fromBattlefield: true,
                      mapId: map.id,
                      deckId: openDeckWorkspace.deckId,
                    },
                  });
                }}
              >
                Study Deck
              </button>
            </div>
            <div className="battlefield-deck-workspace-body">
              {deckWorkspaceView === "list" ? (
                <CardList
                  deckId={openDeckWorkspace.deckId}
                  onCreate={() => { setEditingCard(null); setShowCardForm(true); }}
                  onEdit={(c) => { setEditingCard(c); setShowCardForm(true); }}
                  refetchTrigger={cardRefetchTrigger}
                />
              ) : (
                <div className="battlefield-deck-graph-placeholder">Graph view — card nodes and connections (coming soon)</div>
              )}
            </div>
          </div>
          <Modal isOpen={showCardForm} onClose={() => { setShowCardForm(false); setEditingCard(null); }} title={editingCard ? "Edit Card" : "Create Card"} size="lg">
            <CardForm
              deckId={openDeckWorkspace.deckId}
              initial={editingCard ? { id: editingCard.id, front_content: editingCard.front_content, back_content: editingCard.back_content } : null}
              onSubmit={handleCardFormSubmit}
              onCancel={() => { setShowCardForm(false); setEditingCard(null); }}
              loading={createCardApi.loading || updateCardApi.loading}
              error={createCardApi.error || updateCardApi.error}
            />
          </Modal>
        </div>
      )}

      <input
        ref={importMapInputRef}
        type="file"
        accept=".map,application/json"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const text = await f.text();
            const { title, nodes } = parseMapImportFile(text);
            const data = await mentalMapService.importMap({ title, nodes });
            setNewMapFlow(null);
            showToast("Map imported successfully", "success");
            navigate(`/battlefield/${data.id}`);
          } catch {
            showToast("Invalid .map file", "error");
          }
        }}
      />

      <NewMapChoiceModal
        isOpen={newMapFlow === "choice"}
        onPickEmptyMap={() => {
          setNewMapFlow(null);
          setEmptyMapPromptOpen(true);
        }}
        onPickImportMap={() => {
          setNewMapFlow(null);
          requestAnimationFrame(() => importMapInputRef.current?.click());
        }}
        onPickAiGeneration={() => {
          setNewMapFlow(null);
          setAiGenerationOpen(true);
        }}
        onCancel={() => setNewMapFlow(null)}
      />

      <AIGenerationModal
        isOpen={aiGenerationOpen}
        onClose={() => setAiGenerationOpen(false)}
        onComplete={(mapId) => {
          showToast("Map generated successfully", "success");
          navigate(`/battlefield/${mapId}`);
        }}
        onError={(msg) => showToast(msg, "error")}
      />

      {emptyMapPromptOpen && (
        <FireConfirmModal
          isOpen
          title="New Map"
          message="Name your battlefield (optional)."
          confirmText="Create"
          cancelText="Cancel"
          prompt
          promptPlaceholder="Map name"
          onConfirm={(v) => {
            setEmptyMapPromptOpen(false);
            mentalMapService
              .create({ title: v?.trim() || undefined })
              .then((created) => navigate(`/battlefield/${created.id}`))
              .catch(() => showToast("Failed to create map", "error"));
          }}
          onCancel={() => setEmptyMapPromptOpen(false)}
        />
      )}

      {confirmModal && (
        <FireConfirmModal
          isOpen
          title={confirmModal.type === "deleteMap" ? "Delete Map" : "Delete Territory"}
          message={confirmModal.type === "deleteMap"
            ? `Delete map "${map!.title}"? This cannot be undone.`
            : (() => {
              const n = confirmModal.node;
              const count = getDescendantIds(map!.nodes, n.id).size;
              return count > 0
                ? `Delete "${n.title}" and all ${count} descendant(s)? This cannot be undone.`
                : `Delete "${n.title}"? This cannot be undone.`;
            })()}
          confirmText={confirmModal.type === "deleteMap" ? "Delete Map" : "Delete"}
          cancelText={confirmModal.type === "deleteMap" ? "Cancel" : "Cancel"}
          variant="danger"
          onConfirm={() => {
            if (confirmModal.type === "deleteMap") {
              void doDeleteMap();
              return;
            }
            doDeleteNode(confirmModal.node);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {enhanceNode && (
        <>
          <div
            className="battlefield-context-overlay"
            onClick={() => {
              if (!enhanceLoading) {
                setEnhanceNode(null);
                setEnhancePrompt("");
              }
            }}
          />
          <div className="battlefield-settings-modal">
            <h3>Enhance Node</h3>
            <p className="battlefield-enhance-node-title">{enhanceNode.title}</p>
            <div className="battlefield-enhance-hints">
              <button
                type="button"
                disabled={enhanceLoading}
                onClick={() => setEnhancePrompt("Add example")}
              >
                Add example
              </button>
              <button
                type="button"
                disabled={enhanceLoading}
                onClick={() => setEnhancePrompt("Simplify description")}
              >
                Simplify description
              </button>
              <button
                type="button"
                disabled={enhanceLoading}
                onClick={() => setEnhancePrompt("Link to neighboring node")}
              >
                Link to neighboring node
              </button>
            </div>
            <label>AI Prompt</label>
            <textarea
              className="battlefield-settings-textarea"
              value={enhancePrompt}
              onChange={(e) => setEnhancePrompt(e.target.value)}
              placeholder="Describe how to enhance the node"
              disabled={enhanceLoading}
            />
            <div className="battlefield-settings-actions">
              <Button
                variant="secondary"
                disabled={enhanceLoading}
                onClick={() => {
                  setEnhanceNode(null);
                  setEnhancePrompt("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={enhanceLoading || !enhancePrompt.trim()}
                onClick={() => void handleEnhanceNode()}
              >
                {enhanceLoading ? "Enhancing…" : "Enhance"}
              </Button>
            </div>
          </div>
        </>
      )}

      {editNodeDraft && (
        <>
          <div className="battlefield-context-overlay" onClick={() => setEditNodeDraft(null)} />
          <div className="battlefield-settings-modal">
            <h3>Edit Node</h3>
            <label>Title</label>
            <input
              type="text"
              value={editNodeDraft.title}
              onChange={(e) =>
                setEditNodeDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
              placeholder="Node title"
            />
            <label>Description</label>
            <textarea
              className="battlefield-settings-textarea"
              value={editNodeDraft.description}
              onChange={(e) =>
                setEditNodeDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              placeholder="Brief node description"
            />
            <div className="battlefield-settings-actions">
              <Button variant="secondary" onClick={() => setEditNodeDraft(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void handleSaveNodeDetails()}>
                Save
              </Button>
            </div>
          </div>
        </>
      )}

      {mapSettingsOpen && (
        <>
          <div className="battlefield-context-overlay" onClick={() => setMapSettingsOpen(false)} />
          <div className="battlefield-settings-modal">
            <h3>Map Settings</h3>
            <label>Title</label>
            <input
              type="text"
              value={newMapTitle || map!.title}
              onChange={(e) => setNewMapTitle(e.target.value)}
              placeholder="Campaign Map"
            />
            <div className="battlefield-settings-export">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!map) return;
                  downloadMapFile(buildMapExportFile(map), map.title);
                }}
              >
                Export .map
              </Button>
            </div>
            <div className="battlefield-settings-actions">
              <Button variant="secondary" onClick={() => setMapSettingsOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setConfirmModal({ type: "deleteMap" })}>
                Delete Map
              </Button>
              <Button variant="primary" onClick={handleUpdateMapTitle}>
                Save
              </Button>
            </div>
          </div>
        </>
      )}
          </>
        )}
      </main>
    </div>
  );
}
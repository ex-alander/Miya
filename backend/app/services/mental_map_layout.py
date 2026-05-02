"""Layout coordinates for AI-generated mental map nodes (battlefield constants match frontend)."""

from __future__ import annotations

import math
from collections import deque

MAP_WIDTH = 15000.0
MAP_HEIGHT = 10000.0
NODE_WIDTH = 140.0
NODE_HEIGHT = 72.0

# Радиальные параметры — расстояния увеличены в 5 раз
START_RADIUS = 500.0      # Было 200 → 1000
RADIUS_STEP = 400.0        # Было 180 → 900
ANGLE_START = -math.pi / 2  # -90 градусов (вверх) — можно вращать
BEND_FACTOR = 0.6          # Смягчение углов


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _angle_distribution(total_children: int, idx: int, parent_angle: float) -> float:
    """Равномерно распределяет детей по дуге, центрированной вокруг угла родителя."""
    if total_children <= 1:
        return parent_angle
    
    # Угловой размах дуги — чем больше детей, тем шире
    span = min(math.pi * BEND_FACTOR, math.pi / 2 + (total_children - 1) * 0.15)
    
    # Начальный угол (сдвинут влево от родительского)
    start = parent_angle - span / 2
    
    # Шаг между детьми
    step = span / (total_children - 1) if total_children > 1 else 0
    
    return start + idx * step


def compute_node_positions(parent_of: list[int | None]) -> list[tuple[float, float]]:
    """
    Радиальная раскладка дерева: корень в центре, ветви расходятся во все стороны.
    parent_of[i] — 0-based индекс родителя, или None для корня.
    Возвращает список (x, y) для каждого узла (верхний левый угол).
    """
    n = len(parent_of)
    if n == 0:
        return []

    # === 1. Построение дерева ===
    children: list[list[int]] = [[] for _ in range(n)]
    roots: list[int] = []
    for i, p in enumerate(parent_of):
        if p is None or p < 0 or p >= n or p == i:
            roots.append(i)
        else:
            children[p].append(i)

    if not roots and n > 0:
        roots = [0]

    # === 2. Определение глубины (BFS) ===
    depth = [0] * n
    max_depth = 0
    visited = [False] * n
    q = deque()
    for r in roots:
        depth[r] = 0
        visited[r] = True
        q.append(r)
    while q:
        u = q.popleft()
        max_depth = max(max_depth, depth[u])
        for v in children[u]:
            if not visited[v]:
                depth[v] = depth[u] + 1
                visited[v] = True
                q.append(v)
    for i in range(n):
        if not visited[i]:
            depth[i] = 0
            roots.append(i)
            visited[i] = True

    # === 3. Вычисление весов поддеревьев (количество узлов) ===
    weight = [1] * n
    for u in range(n - 1, -1, -1):
        if children[u]:
            weight[u] = sum(weight[c] for c in children[u])

    # === 4. Радиальная раскладка ===
    pos: list[tuple[float, float]] = [(0.0, 0.0)] * n
    
    center_x = MAP_WIDTH / 2 - NODE_WIDTH / 2
    center_y = MAP_HEIGHT / 2 - NODE_HEIGHT / 2
    
    # Углы для множественных корней
    root_angles: list[float] = []
    if len(roots) > 1:
        total_weight = sum(weight[r] for r in roots)
        acc = 0.0
        for r in roots:
            angle_span = 2 * math.pi * (weight[r] / total_weight)
            root_angles.append(acc + angle_span / 2)
            acc += angle_span
    else:
        root_angles = [ANGLE_START]

    def place_node(u: int, parent_angle: float, is_root: bool = False):
        d = depth[u]
        radius = START_RADIUS + d * RADIUS_STEP
        
        if is_root:
            angle = parent_angle
        else:
            angle = parent_angle
        
        cx = center_x + radius * math.cos(angle)
        cy = center_y + radius * math.sin(angle)
        
        x = _clamp(cx - NODE_WIDTH / 2, 0, MAP_WIDTH - NODE_WIDTH)
        y = _clamp(cy - NODE_HEIGHT / 2, 0, MAP_HEIGHT - NODE_HEIGHT)
        pos[u] = (x, y)
        
        if children[u]:
            n_children = len(children[u])
            for idx, child in enumerate(children[u]):
                child_angle = _angle_distribution(n_children, idx, angle)
                place_node(child, child_angle)

    for idx, r in enumerate(roots):
        angle = root_angles[idx] if root_angles else ANGLE_START + idx * (2 * math.pi / len(roots))
        place_node(r, angle, is_root=True)

    # === 5. Пост-обработка: разрешение коллизий ===
    for _iter in range(5):
        moved = False
        for u in range(n):
            if not children[u]:
                continue
            
            child_positions = [pos[c] for c in children[u]]
            if not child_positions:
                continue
            
            # Центр детей
            cx_children = sum(p[0] + NODE_WIDTH/2 for p in child_positions) / len(child_positions)
            cy_children = sum(p[1] + NODE_HEIGHT/2 for p in child_positions) / len(child_positions)
            
            # Родительский центр
            parent_cx = pos[u][0] + NODE_WIDTH/2
            parent_cy = pos[u][1] + NODE_HEIGHT/2
            
            dx_child = cx_children - parent_cx
            dy_child = cy_children - parent_cy
            dist = math.hypot(dx_child, dy_child)
            
            # Если дети слишком далеко — подтягиваем
            target_dist = RADIUS_STEP * 1.2
            if dist > target_dist and dist > 0.01:
                factor = 0.15
                for c in children[u]:
                    cx = pos[c][0] + NODE_WIDTH/2
                    cy = pos[c][1] + NODE_HEIGHT/2
                    new_cx = cx - dx_child * factor
                    new_cy = cy - dy_child * factor
                    new_x = _clamp(new_cx - NODE_WIDTH/2, 0, MAP_WIDTH - NODE_WIDTH)
                    new_y = _clamp(new_cy - NODE_HEIGHT/2, 0, MAP_HEIGHT - NODE_HEIGHT)
                    if (new_x, new_y) != pos[c]:
                        pos[c] = (new_x, new_y)
                        moved = True
        
        if not moved:
            break

    # === 6. Финальная зачистка ===
    for i in range(n):
        x, y = pos[i]
        pos[i] = (
            _clamp(x, 0, MAP_WIDTH - NODE_WIDTH),
            _clamp(y, 0, MAP_HEIGHT - NODE_HEIGHT),
        )

    return pos
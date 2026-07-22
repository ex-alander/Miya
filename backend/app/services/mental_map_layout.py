import math
from typing import Optional

# Карта 15000×10000, узлы 140×72
MAP_WIDTH = 15000
MAP_HEIGHT = 10000
NODE_WIDTH = 140
NODE_HEIGHT = 72

# Параметры раскладки
LEVEL_SPACING = 260.0      # расстояние между уровнями по радиусу


class _TreeNode:
    def __init__(self, id: int, parent: Optional['_TreeNode'] = None):
        self.id = id
        self.parent = parent
        self.children: list['_TreeNode'] = []
        self.x = 0.0          # Центральный угол (в радианах)
        self.y = 0.0          # Глубина (уровень)
        self.weight = 1       # Количество листьев в поддереве


def _build_tree(parent_of: list[int | None]) -> Optional[_TreeNode]:
    n = len(parent_of)
    nodes = [_TreeNode(i) for i in range(n)]
    root = None
    for i, p in enumerate(parent_of):
        if p is None:
            root = nodes[i]
        elif 0 <= p < n:
            nodes[p].children.append(nodes[i])
            nodes[i].parent = nodes[p]
    return root


def _compute_depth(parent_of: list[int | None]) -> list[int]:
    depth = [0] * len(parent_of)
    for i in range(len(parent_of)):
        d = 0
        cur = i
        while parent_of[cur] is not None:
            cur = parent_of[cur]
            d += 1
        depth[i] = d
    return depth


def _compute_weights(node: _TreeNode) -> int:
    if not node.children:
        node.weight = 1
        return 1
    
    total = 0
    for child in node.children:
        total += _compute_weights(child)
    
    node.weight = total
    return total


def _layout_radial_circular(node: _TreeNode, parent_angle: float, sector_width: float, depth: int):
    """
    Радиальная раскладка: дети окружают родителя.
    Узел получает свой угол = parent_angle.
    А его дети распределяются внутри сектора sector_width, центрированного вокруг parent_angle.
    """
    node.y = depth
    node.x = parent_angle

    if not node.children:
        return

    total_weight = node.weight
    
    # Если у родителя всего 1 ребенок, он просто продолжает направление родителя.
    if len(node.children) == 1:
        child_sector = sector_width 
        _layout_radial_circular(node.children[0], parent_angle, child_sector, depth + 1)
    else:
        # Делим сектор между детьми строго пропорционально их весам
        start_angle = parent_angle - sector_width / 2
        end_angle = parent_angle + sector_width / 2
        
        current_angle = start_angle
        for child in node.children:
            child_share = (sector_width * (child.weight / total_weight))
            child_angle = current_angle + child_share / 2 
            
            _layout_radial_circular(child, child_angle, child_share, depth + 1)
            current_angle += child_share


def compute_node_positions(parent_of: list[int | None]) -> list[tuple[float, float]]:
    """
    Радиальная раскладка с полным заполнением эллипса (для широких экранов).
    """
    if not parent_of:
        return []

    n = len(parent_of)
    root = _build_tree(parent_of)
    if not root:
        return [(MAP_WIDTH / 2, MAP_HEIGHT / 2)] * n

    # 1. Вычисляем глубину и веса
    depth = _compute_depth(parent_of)
    _compute_weights(root)
    
    # 2. Запускаем полную круговую раскладку.
    FULL_CIRCLE = 2 * math.pi
    _layout_radial_circular(root, 0.0, FULL_CIRCLE, 0)

    # 3. Собираем позиции в словарь
    def collect(node: _TreeNode, positions: dict):
        positions[node.id] = (node.x, node.y)
        for child in node.children:
            collect(child, positions)

    temp: dict[int, tuple[float, float]] = {}
    collect(root, temp)

    # 4. Преобразуем угол и глубину в декартовы координаты с ГОРИЗОНТАЛЬНЫМ РАСТЯЖЕНИЕМ
    result: list[tuple[float, float]] = []
    for i in range(n):
        angle, d = temp.get(i, (0.0, 0))
        
        if d == 0:
            result.append((MAP_WIDTH / 2, MAP_HEIGHT / 2))
        else:
            radius = d * LEVEL_SPACING
            
            # 👇 ЭТО ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ.
            # Мы растягиваем X (синус) сильнее, чем Y (косинус).
            # Коэффициент 1.25 берется примерно из соотношения сторон 15000/10000 = 1.5.
            # Я поставил 1.25, чтобы было не слишком сплюснуто, но экономно по вертикали.
            stretch_x = 1.35
            stretch_y = 0.75 
            
            cx = MAP_WIDTH / 2 + radius * math.sin(angle) * stretch_x
            cy = MAP_HEIGHT / 2 - radius * math.cos(angle) * stretch_y
            result.append((cx, cy))

    return result
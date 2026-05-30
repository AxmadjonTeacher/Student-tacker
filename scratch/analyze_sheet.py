import sys
from PIL import Image

def find_markers(img_path):
    img = Image.open(img_path).convert('L')
    width, height = img.size
    pixels = img.load()
    
    # Threshold the image to binary (black/white)
    # Since background is white (255) and markers are solid black (0),
    # thresholding at 100 is very safe.
    binary = []
    for y in range(height):
        row = []
        for x in range(width):
            val = pixels[x, y]
            row.append(1 if val < 100 else 0)
        binary.append(row)
        
    # Find connected components (simple flood fill)
    visited = [[False for _ in range(width)] for _ in range(height)]
    components = []
    
    for y in range(height):
        for x in range(width):
            if binary[y][x] == 1 and not visited[y][x]:
                # Start flood fill
                component = []
                queue = [(x, y)]
                visited[y][x] = True
                
                while queue:
                    cx, cy = queue.pop(0)
                    component.append((cx, cy))
                    
                    # 4-connectivity
                    for nx, ny in [(cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1)]:
                        if 0 <= nx < width and 0 <= ny < height:
                            if binary[ny][nx] == 1 and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                
                if len(component) > 50: # Ignore tiny noise
                    components.append(component)
                    
    print(f"Found {len(components)} connected components.")
    
    markers = []
    for idx, comp in enumerate(components):
        xs = [pt[0] for pt in comp]
        ys = [pt[1] for pt in comp]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max_x - min_x + 1
        h = max_y - min_y + 1
        centroid_x = sum(xs) / len(xs)
        centroid_y = sum(ys) / len(ys)
        
        # Check if it's square-ish
        aspect_ratio = w / h
        if 0.7 <= aspect_ratio <= 1.3 and 10 <= w <= 60:
            markers.append({
                'id': idx,
                'min_x': min_x, 'max_x': max_x,
                'min_y': min_y, 'max_y': max_y,
                'width': w, 'height': h,
                'x': centroid_x, 'y': centroid_y
            })
            
    # Sort markers by y first, then x
    markers.sort(key=lambda m: (m['y'], m['x']))
    
    print("\nCandidate markers (sorted by Y, then X):")
    for m in markers:
        print(f"Centroid: ({m['x']:.1f}, {m['y']:.1f}), Box: {m['width']}x{m['height']}")
        
    return markers

if __name__ == '__main__':
    find_markers('/Users/ahmetyadgarov/Desktop/Students progress/public/media__1780067393687.jpg')

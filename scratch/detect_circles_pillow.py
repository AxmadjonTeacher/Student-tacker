import sys
import math
from PIL import Image

def detect_hollow_circles(img_path):
    img = Image.open(img_path).convert('L')
    width, height = img.size
    pixels = img.load()
    
    # We want to scan the image and compute the circle score
    # To make it fast, we can sample every 2 pixels first, then refine.
    # Radius of bubble: outer is about 11, inner is about 5.
    r_in = 5
    r_out_min = 9
    r_out_max = 12
    
    # Precompute pixel offsets for inner disk and outer ring
    in_offsets = []
    for dy in range(-r_in, r_in + 1):
        for dx in range(-r_in, r_in + 1):
            if dx*dx + dy*dy <= r_in*r_in:
                in_offsets.append((dx, dy))
                
    out_offsets = []
    for dy in range(-r_out_max, r_out_max + 1):
        for dx in range(-r_out_max, r_out_max + 1):
            dist2 = dx*dx + dy*dy
            if r_out_min*r_out_min <= dist2 <= r_out_max*r_out_max:
                out_offsets.append((dx, dy))
                
    print(f"Inner offsets: {len(in_offsets)}, Outer offsets: {len(out_offsets)}")
    
    scores = {}
    # Scan coordinates where bubbles are likely to be.
    # From X=50 to X=600, Y=100 to Y=890
    step = 2
    for y in range(100, height - 20, step):
        for x in range(30, width - 30, step):
            # Compute inner mean
            inner_sum = 0
            for dx, dy in in_offsets:
                inner_sum += pixels[x + dx, y + dy]
            inner_mean = inner_sum / len(in_offsets)
            
            # Compute outer mean
            outer_sum = 0
            for dx, dy in out_offsets:
                outer_sum += pixels[x + dx, y + dy]
            outer_mean = outer_sum / len(out_offsets)
            
            score = inner_mean - outer_mean
            if score > 80: # Threshold for a candidate circle
                scores[(x, y)] = score
                
    # Non-maximum suppression to find centers
    detected = []
    sorted_candidates = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    
    for (x, y), score in sorted_candidates:
        # Check if too close to an already detected circle
        too_close = False
        for dx, dy, ds in detected:
            if (x - dx)**2 + (y - dy)**2 < 15*15:
                too_close = True
                break
        if not too_close:
            detected.append((x, y, score))
            
    print(f"Detected {len(detected)} hollow circles.")
    
    # Sort into columns and rows
    # Group by Y first (row clustering)
    rows = []
    for (x, y, s) in detected:
        added = False
        for r in rows:
            if abs(r[0][1] - y) < 8:
                r.append((x, y, s))
                added = True
                break
        if not added:
            rows.append([(x, y, s)])
            
    # Sort rows by Y
    rows.sort(key=lambda r: r[0][1])
    
    # Sort each row by X
    for r in rows:
        r.sort(key=lambda c: c[0])
        
    print("\nDetected Rows and Columns:")
    for idx, r in enumerate(rows):
        avg_y = sum(c[1] for c in r) / len(r)
        xs = [c[0] for c in r]
        print(f"Row {idx:2d} (avg Y={avg_y:.1f}): {len(r)} circles at X={xs}")
        
    return rows

if __name__ == '__main__':
    detect_hollow_circles('/Users/ahmetyadgarov/Desktop/Students progress/public/media__1780067393687.jpg')

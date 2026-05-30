import cv2
import numpy as np

def detect_bubbles(img_path):
    img = cv2.imread(img_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Use Hough Circle Transform to find bubbles
    circles = cv2.HoughCircles(
        blurred, 
        cv2.HOUGH_GRADIENT, 
        dp=1, 
        minDist=15, 
        param1=50, 
        param2=20, 
        minRadius=8, 
        maxRadius=18
    )
    
    if circles is not None:
        circles = np.round(circles[0, :]).astype("int")
        print(f"Detected {len(circles)} circles.")
        
        # Sort circles: first group into rows by Y coordinate
        # We can group circles that have Y within 10 pixels of each other
        rows = []
        for (x, y, r) in circles:
            added = False
            for row in rows:
                if abs(row[0][1] - y) < 10:
                    row.append((x, y, r))
                    added = True
                    break
            if not added:
                rows.append([(x, y, r)])
                
        # Sort rows by Y
        rows.sort(key=lambda r: r[0][1])
        
        # For each row, sort circles by X
        for row in rows:
            row.sort(key=lambda c: c[0])
            
        print("\nCircle Rows:")
        for idx, row in enumerate(rows):
            avg_y = sum(c[1] for c in row) / len(row)
            xs = [c[0] for c in row]
            print(f"Row {idx:2d} (avg Y={avg_y:.1f}): {len(row)} circles at X={xs}")
            
    else:
        print("No circles found.")

if __name__ == '__main__':
    # Check if cv2 is installed
    try:
        detect_bubbles('/Users/ahmetyadgarov/Desktop/Students progress/public/media__1780067393687.jpg')
    except Exception as e:
        print("Error:", e)

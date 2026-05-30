from PIL import Image

def scan_lines(img_path):
    img = Image.open(img_path).convert('L')
    width, height = img.size
    pixels = img.load()
    
    # Let's check Question 1 (Row 1)
    # The corner markers are:
    # TL: (17, 55), TR: (628, 55), BL: (17, 885), BR: (628, 885)
    # The first row of bubbles is around Y = 160. Let's find local minima in Y from 140 to 180 on the left side
    
    print("--- SCANNING FOR QUESTIONS 1-13 ---")
    # For question 1, let's find the centers of the 4 bubbles (A, B, C, D)
    # A bubble center is a local maximum of brightness (inside the circle) surrounded by local minima (the circle lines)
    # Let's scan Y from 140 to 180, and X from 80 to 280, and print the local minima (or dark lines)
    
    # Let's do a vertical scan on the left column to find the exact Y coordinates of the 13 questions.
    # The bubbles are located around X=120, 150, 180, 210.
    # Let's average the intensity along X=[110, 220] to find the rows
    y_profile = []
    for y in range(100, 880):
        # average intensity across a horizontal strip where question 1-13 bubbles lie
        row_sum = 0
        count = 0
        for x in range(115, 235):
            row_sum += pixels[x, y]
            count += 1
        y_profile.append((y, row_sum / count))
        
    # Find local minima in y_profile (the dark horizontal lines of the circles)
    # Since each bubble has a top and bottom edge, the bubble centers will be between these edges.
    # Or, we can just find the centers of the bubbles directly!
    # Let's do a 2D local minimum search for dark rings.
    # A simpler way: we know that the bubbles are highly periodic.
    # Let's find the centers for Question 1:
    # Let's scan X at Y=160 (Question 1)
    # We should print the pixels across X=[100, 300] to see the valleys
    
    print("\nValleys along X for Question 1 (Y=158):")
    for x in range(100, 300, 2):
        print(f"X={x:3d}: {pixels[x, 158]}")
        
    print("\nValleys along X for ID Grid (Y=215, right side X=[450, 600]):")
    for x in range(450, 600, 2):
        print(f"X={x:3d}: {pixels[x, 215]}")
        
if __name__ == '__main__':
    scan_lines('/Users/ahmetyadgarov/Desktop/Students progress/public/media__1780067393687.jpg')

from PIL import Image, ImageDraw

def draw_visual_grid(img_path, output_path):
    img = Image.open(img_path).convert('RGB')
    draw = ImageDraw.Draw(img)
    
    # Left questions (Q1 - Q13)
    x_coords_left = [130, 174, 218, 262]
    y_start_left = 161
    y_step_left = 56.33
    
    for row in range(13):
        y = int(y_start_left + row * y_step_left)
        for col_idx, x in enumerate(x_coords_left):
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill='red')
            draw.ellipse([x - 12, y - 12, x + 12, y + 12], outline='blue', width=1)
            
    # Right questions (Q14 - Q15)
    x_coords_right = [352, 396, 440, 484]
    y_start_right = 161
    y_step_right = 56.33
    
    for row in range(2):
        y = int(y_start_right + row * y_step_right)
        for col_idx, x in enumerate(x_coords_right):
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill='orange')
            draw.ellipse([x - 12, y - 12, x + 12, y + 12], outline='blue', width=1)
            
    # Student ID Grid (3 columns, 10 rows: 0 to 9)
    # Refined: Y starting at 408, stepping 41.33. X shifted by +3
    x_coords_id = [479, 523, 567]
    y_start_id = 408
    y_step_id = 41.33
    
    for row in range(10):
        y = int(y_start_id + row * y_step_id)
        for col_idx, x in enumerate(x_coords_id):
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill='green')
            draw.ellipse([x - 11, y - 11, x + 11, y + 11], outline='blue', width=1)
            
    # Save the output image
    img.save(output_path)
    print(f"Visualized template saved to {output_path}")

if __name__ == '__main__':
    draw_visual_grid('/Users/ahmetyadgarov/Desktop/Students progress/public/media__1780067393687.jpg', 
                     '/Users/ahmetyadgarov/Desktop/Students progress/scratch/visualized_template.png')

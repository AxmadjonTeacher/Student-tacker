import os
from PIL import Image, ImageDraw

def add_corners(im, rad):
    # Convert image to RGBA if not already
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    
    # Create mask for rounded corners
    mask = Image.new('L', im.size, 255)
    width, height = im.size
    
    # Create a draw object on the mask
    draw = ImageDraw.Draw(mask)
    
    # Draw transparent corners
    # We can do this by drawing a white rounded rectangle on a black mask,
    # or by drawing black corners on a white mask.
    # Drawing black corners is very simple using pieslice or drawing arcs.
    # A cleaner way: draw a white rounded rectangle on a black mask.
    mask = Image.new('L', im.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, width - 1, height - 1], radius=rad, fill=255)
    
    # Apply mask as alpha channel
    im.putalpha(mask)
    return im

def main():
    src_path = "/Users/ahmetyadgarov/.gemini/antigravity/brain/09aa5866-9ada-471b-8248-2bb412ec017e/media__1779987468844.jpg"
    dest_dir = "/Users/ahmetyadgarov/Desktop/Students progress/public"
    
    if not os.path.exists(src_path):
        print(f"Source file not found at {src_path}")
        return
        
    im = Image.open(src_path)
    
    # Ensure square aspect ratio
    w, h = im.size
    min_dim = min(w, h)
    # crop center square
    left = (w - min_dim) / 2
    top = (h - min_dim) / 2
    right = (w + min_dim) / 2
    bottom = (h + min_dim) / 2
    im_square = im.crop((left, top, right, bottom))
    
    # Let's create:
    # 1. icon-light.png (1024x1024)
    # 2. icon-light-512.png (512x512)
    # 3. icon-light-192.png (192x192)
    
    sizes = {
        "icon-light.png": 1024,
        "icon-light-512.png": 512,
        "icon-light-192.png": 192
    }
    
    for filename, size in sizes.items():
        # Resize using Lanczos filter for high quality downscaling
        resized = im_square.resize((size, size), Image.Resampling.LANCZOS)
        
        # Apply rounded corners. A good radius for app icons is ~16% of the size.
        radius = int(size * 0.16)
        rounded = add_corners(resized, radius)
        
        out_path = os.path.join(dest_dir, filename)
        rounded.save(out_path, "PNG")
        print(f"Saved {out_path} (size: {size}x{size}, radius: {radius})")

if __name__ == "__main__":
    main()

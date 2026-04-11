import sys
from PIL import Image

def process(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        # Calculate how close to white it is
        # We can just look at brightness
        if r > 240 and g > 240 and b > 240:
            avg = (r + g + b) / 3
            # Fade out transparency for antialiasing
            new_a = int(max(0, 255 - (avg - 240) * (255 / 15)))
            new_data.append((r, g, b, new_a))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    # Auto crop based on alpha channel
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(out_path, "PNG")

if __name__ == "__main__":
    process(sys.argv[1], sys.argv[2])

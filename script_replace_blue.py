import os
import re

directories_to_scan = [
    r"g:\LightIDEA\frontend\app",
    r"g:\LightIDEA\frontend\components"
]

files_updated = 0

for root_dir in directories_to_scan:
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.tsx', '.ts', '.jsx', '.js', '.css')):
                filepath = os.path.join(dirpath, filename)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Only proceed if there's a match to avoid unnecessary writes
                    if 'indigo-' in content or 'violet-' in content:
                        new_content = re.sub(r'\bindigo-(\d+)', r'blue-\1', content)
                        new_content = re.sub(r'\bviolet-(\d+)', r'blue-\1', new_content)
                        
                        if new_content != content:
                            with open(filepath, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            files_updated += 1
                except Exception as e:
                    print(f"Error reading/writing {filepath}: {e}")

print(f"Updated {files_updated} files")

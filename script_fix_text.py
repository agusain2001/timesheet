import os
import re

directories_to_scan = [
    r"g:\LightIDEA\frontend\app",
    r"g:\LightIDEA\frontend\components"
]

files_updated = 0

replacements = {
    # text colors
    r"text-slate-50": "text-foreground",
    r"text-slate-100": "text-foreground",
    r"text-slate-200": "text-foreground/90",
    r"text-slate-300": "text-foreground/80",
    r"text-slate-400": "text-foreground/60",
    r"text-slate-500": "text-foreground/50",
    r"text-slate-600": "text-foreground/40",
    r"text-slate-700": "text-foreground/30",
    r"text-slate-800": "text-foreground/20",
    r"text-slate-900": "text-foreground/10",
    r"text-slate-950": "text-foreground/10",
    
    # subtle backgrounds and hovers that were hardcoded white for dark mode
    r"bg-white/2": "bg-foreground/[0.01]",
    r"bg-white/3": "bg-foreground/[0.01]",
    r"bg-white/5": "bg-foreground/[0.02]",
    r"bg-white/10": "bg-foreground/[0.05]",
    r"bg-white/20": "bg-foreground/10",
    r"hover:bg-white/2": "hover:bg-foreground/[0.01]",
    r"hover:bg-white/3": "hover:bg-foreground/[0.01]",
    r"hover:bg-white/5": "hover:bg-foreground/[0.02]",
    r"hover:bg-white/10": "hover:bg-foreground/[0.05]",
    r"hover:bg-white/20": "hover:bg-foreground/10",
    r"hover:text-slate-200": "hover:text-foreground/90",
    r"hover:text-slate-300": "hover:text-foreground/80",
    r"hover:text-slate-400": "hover:text-foreground/60",
    
    # subtle borders
    r"border-white/5": "border-foreground/5",
    r"border-white/10": "border-foreground/10",
    r"border-white/20": "border-foreground/20",
}

for root_dir in directories_to_scan:
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.tsx', '.ts', '.jsx', '.js')):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    new_content = content
                    for old, new in replacements.items():
                        new_content = re.sub(r'\b' + re.escape(old) + r'\b', new, new_content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        files_updated += 1
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

print(f"Updated {files_updated} files with text and subtle background adaptions.")

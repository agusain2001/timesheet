import sys
import re

files = [
    r"g:\LightIDEA\frontend\app\(protected)\reports\page.tsx",
    r"g:\LightIDEA\frontend\app\(protected)\reports\scheduled\page.tsx",
    r"g:\LightIDEA\frontend\app\(protected)\templates\page.tsx"
]

replacements = {
    r"text-slate-100": "text-foreground",
    r"text-slate-200": "text-foreground/90",
    r"text-slate-300": "text-foreground/80",
    r"text-slate-400": "text-foreground/60",
    r"text-slate-500": "text-foreground/50",
    r"text-slate-600": "text-foreground/40",
    r"bg-white/5": "bg-foreground/[0.02]",
    r"border-white/10": "border-foreground/10",
    r"border-white/5": "border-foreground/5",
    r"bg-white/10": "bg-foreground/10",
    r"bg-white/3": "bg-foreground/[0.01]",
    r'fill="#64748b"': 'fill="currentColor" className="text-foreground/50"',
    r'stroke="#94a3b8"': 'stroke="currentColor" className="text-foreground/40"',
    r'border-slate-500': 'border-foreground/50',
    r'text-slate-700': 'text-foreground/30',
    r'text-slate-800': 'text-foreground/20',
    r'text-slate-900': 'text-foreground/10',
    r'bg-slate-50': 'bg-foreground/[0.02]',
    r'bg-slate-100': 'bg-foreground/[0.05]',
    r'bg-slate-200': 'bg-foreground/10',
    r'bg-slate-800': 'bg-foreground/[0.05]',
    r'bg-slate-900': 'bg-foreground/10',
    r'border-slate-200': 'border-foreground/10',
    r'border-slate-800': 'border-foreground/10',
    r'hover:bg-slate-100': 'hover:bg-foreground/[0.05]',
    r'hover:bg-slate-800': 'hover:bg-foreground/[0.05]',
    r'hover:text-slate-200': 'hover:text-foreground/90',
    r'hover:text-slate-900': 'hover:text-foreground/90',
}

import os

updated_count = 0
for filepath in files:
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = re.sub(old, new, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    updated_count += 1

print(f"Updated {updated_count} files")

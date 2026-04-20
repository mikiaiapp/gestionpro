import os

filepath = 'src/app/proyectos/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Remove extra divs between totals and conditions
totals_end = -1
cond_start = -1
for i, line in enumerate(lines):
    if 'formatCurrency(totalProyecto)' in line:
        for j in range(i, i+10):
            if '</div>' in lines[j]:
                totals_end = j
                break
    if 'Condiciones Particulares' in line:
        cond_start = i
        break

if totals_end != -1 and cond_start != -1:
    new_lines = lines[:totals_end+1]
    # Keep only empty lines/newlines or other stuff, but NO </div> tags here
    for i in range(totals_end + 1, cond_start):
        if '</div>' not in lines[i]:
            new_lines.append(lines[i])
    new_lines.extend(lines[cond_start:])
    lines = new_lines

# 2. Fix setLineas initialization
for i, line in enumerate(lines):
    if 'setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }])' in line:
        lines[i] = line.replace('setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }])', 
                                'setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0, coste: 0 }])')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Fix applied")

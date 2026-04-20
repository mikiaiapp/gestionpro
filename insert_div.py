import os

filepath = 'src/app/proyectos/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find where to insert
target_idx = -1
for i, line in enumerate(lines):
    if 'TOTAL VENTA' in line:
        # insert after the next few lines which should be the closing </div> of Sub A2
        for j in range(i, i+5):
            if '</div>' in lines[j]:
                target_idx = j + 1
                break
        break

if target_idx != -1:
    lines.insert(target_idx, '               </div>\n')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Div inserted")
else:
    print("Target not found")

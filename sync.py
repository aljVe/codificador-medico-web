import csv
import re

csv_path = r'c:\Users\aleja\Desktop\Programas hospital\Codificador médico\base_datos_recalmin.csv'
js_path = r'c:\Users\aleja\Desktop\Programas hospital\Codificador médico\data.js'

with open(csv_path, 'r', encoding='utf-8-sig') as f:
    # Skip line 1 (comment)
    next(f)
    reader = csv.DictReader(f, delimiter=';')
    
    js_array = "const rawCsvData = [\n"
    for row in reader:
        tipo = row['TIPO']
        terms = row['TERMINOS_BUSQUEDA']
        alert = row['ALERTA_CDI'].replace("'", "\\'").replace('"', '\\"')
        text = row['TEXTO_NORMATIVO'].replace("'", "\\'").replace('"', '\\"')
        tree = row['REQUIERE_ARBOL'].strip().upper() == 'TRUE'
        
        # Escape quotes in terms
        terms = terms.replace("'", "\\'").replace('"', '\\"')
        
        tree_str = "true" if tree else "false"
        
        js_array += f'    {{ type: "{tipo}", terms: "{terms}", alert: "{alert}", text: "{text}", tree: {tree_str} }},\n'
    
    # Remove last comma
    js_array = js_array.rstrip(",\n") + "\n];"

with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

# Replace the block
pattern = r'const rawCsvData = \[\s*\{.*?\}\s*\];'
new_js_content = re.sub(pattern, js_array, js_content, flags=re.DOTALL)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(new_js_content)

print("data.js successfully synchronized with the new CSV payload.")

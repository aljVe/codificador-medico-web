import csv
import re

def run_tests():
    filepath = r'c:\Users\aleja\Desktop\Programas hospital\Codificador médico\base_datos_recalmin.csv'
    
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        # read first line to see if it's a comment
        line = f.readline()
        if not line.startswith('#'):
            f.seek(0) # go back if not a comment
            
        reader = csv.DictReader(f, delimiter=';')
        rows = list(reader)
        
    print(f"Loaded {len(rows)} rows.")
    
    errors = []
    
    for idx, row in enumerate(rows):
        line = idx + 2
        terminos = row['TERMINOS_BUSQUEDA']
        texto = row['TEXTO_NORMATIVO']
        req_arbol = row['REQUIERE_ARBOL'].upper() == 'TRUE'
        
        # 1. Test unclosed brackets
        open_brackets = texto.count('[')
        closed_brackets = texto.count(']')
        if open_brackets != closed_brackets:
            errors.append(f"Line {line}: Mismatched brackets in {terminos[:20]}... -> {texto}")
            
        # 2. Test tree requirements
        brackets_content = re.findall(r'\[(.*?)\]', texto)
        has_slash_bracket = any('/' in b for b in brackets_content)
        
        if req_arbol and not has_slash_bracket:
            errors.append(f"Line {line}: REQUIRES TREE but no [Option1 / Option2] found in text: {texto}")
        if not req_arbol and has_slash_bracket:
            errors.append(f"Line {line}: Does NOT require tree, but has slash bracket in text: {texto}")
            
        # 3. Deep Tree Validation
        if req_arbol:
            for b in brackets_content:
                if '/' in b:
                    options = [o.strip() for o in b.split('/')]
                    if any(len(o) == 0 for o in options):
                        errors.append(f"Line {line}: Empty or trailing slash option in bracket: [{b}]")
                    if len(options) < 2:
                        errors.append(f"Line {line}: Slash found but less than 2 valid options: [{b}]")
                    
                    # Ensure options don't contain forbidden chars that could break JS/Java strings
                    for opt in options:
                        if '"' in opt or "'" in opt:
                            errors.append(f"Line {line}: Option contains quotes which might break JS eval: {opt}")

        # 4. Search term validation
        terms = [t.strip() for t in terminos.split('|')]
        if any(len(t) < 2 for t in terms):
            errors.append(f"Line {line}: Contains a search term less than 2 characters (too short for fuzzy match): {terminos}")
            
        # 5. Type and Alert Validation
        tipo = row['TIPO']
        if tipo not in ['Diagnostico', 'Procedimiento', 'Procedimiento Omitido']:
            errors.append(f"Line {line}: Unknown TIPO '{tipo}'")
            
    with open("verify_log.txt", "w", encoding="utf-8") as out:
        if not errors:
            out.write("ALL DATA VERIFICATION TESTS PASSED.\n")
        else:
            out.write("ERRORS FOUND:\n")
            for err in errors:
                out.write(" - " + err + "\n")

if __name__ == '__main__':
    run_tests()

import json
import re
from pathlib import Path

data_path = Path(r'C:\Users\aleja\Desktop\Programas hospital\Codificador médico\data.js')
data_content = data_path.read_text('utf-8')

# extract the rawCsvData array
match = re.search(r'const rawCsvData = (\[.*?\]);', data_content, re.DOTALL)
if match:
    # Need to make it valid JSON
    array_str = match.group(1)
    # This is a bit tricky because JS obj keys aren't quoted. Let's do a simple parse.
    import ast
    # JS array to python list of dicts.
    pass

# We already know what data.js contains. Let's just simulate the search logic.
terms_str = "brote lupico|brote de lupus|les|lupus eritematoso sistemico|lupus|lupus eritematoso|enfermedad lupica|lupus articular|lupus cutaneo|recaida lupica|lupus activo|reactivacion lupus|lupus eritematoso diseminado|brote poliarticular lupico"
terms = terms_str.split('|')

query = "les"
directMatch = any(query.lower() in t.lower() for t in terms)
print(f"Direct Match for 'les': {directMatch}")
query = "lupus"
directMatch = any(query.lower() in t.lower() for t in terms)
print(f"Direct Match for 'lupus': {directMatch}")

# Wait, why wouldn't it work for the user?
# Maybe the query matches too many things and the UI breaks?
# Let's count how many terms in data.js contain 'les' or 'lupus'

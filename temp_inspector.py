import ast, sys, json
tree = ast.parse(open(sys.argv[1], encoding='utf-8').read())
classes = []
for c in tree.body:
    if isinstance(c, ast.ClassDef):
        methods = [m.name for m in c.body if isinstance(m, ast.FunctionDef)]
        classes.append({'name': c.name, 'methods': methods})
with open(sys.argv[2], 'w') as f:
    json.dump(classes, f, indent=2)

#!/usr/bin/env python3
"""
Framework de despliegue a GitHub - Codificador Médico CDI
=========================================================
Sube las dos versiones del programa a GitHub con retry automático y validación.

Versiones:
  - Web estática: HTML + JS + CSV (carpeta raíz)
  - Java:         Spring Boot + Maven (carpeta Buscador_Java/)

Uso:
  python deploy_github.py
  GITHUB_TOKEN=xxx python deploy_github.py   (sin prompt de token)
"""

import os
import sys
import json
import time
import getpass
import subprocess
from pathlib import Path

try:
    import requests
except ImportError:
    print("[ERROR] Falta la librería 'requests'. Instálala con:")
    print("  pip install requests")
    sys.exit(1)

# =============================================================================
# CONFIGURACIÓN - Edita estos valores si quieres cambiar los nombres de repo
# =============================================================================
BASE_DIR      = Path(r"c:\Users\aleja\Desktop\Programas hospital\Codificador médico")
STATIC_DIR    = BASE_DIR
JAVA_DIR      = BASE_DIR / "Buscador_Java"

STATIC_REPO   = "codificador-medico-web"
JAVA_REPO     = "codificador-medico-java"

GIT_EMAIL     = "codificador@hospital.local"
GIT_USER_NAME = "Codificador Médico"

MAX_RETRIES   = 3
RETRY_DELAY   = 5   # segundos entre reintentos

# =============================================================================
# .GITIGNORE - contenido para cada versión
# =============================================================================
STATIC_GITIGNORE = """\
# Carpeta Java (tiene su propio repo)
Buscador_Java/

# Logs y outputs temporales
verify_log.txt
verify_output.txt

# IDE
.vscode/

# Python cache
__pycache__/
*.pyc
"""

JAVA_GITIGNORE = """\
# Maven build output
target/

# Logs y outputs de test
test_output.txt

# IDE
.vscode/
.idea/
*.iml

# Python cache
__pycache__/
*.pyc
"""

# Archivos mínimos que deben estar en GitHub tras el push (validación)
STATIC_REQUIRED = ["index.html", "app.js", "styles.css", "data.js"]
JAVA_REQUIRED   = ["pom.xml", "src"]


# =============================================================================
# HELPERS GIT / GITHUB
# =============================================================================

def run(cmd, cwd=None, check=True, silent=False):
    """Ejecuta un comando shell y devuelve stdout."""
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True,
        cwd=str(cwd) if cwd else None
    )
    if not silent and result.stdout.strip():
        pass  # output disponible en result
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def api(method, url, token, **kwargs):
    """Wrapper para llamadas a la API de GitHub."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json"
    }
    resp = getattr(requests, method)(url, headers=headers, **kwargs)
    return resp


def get_username(token):
    r = api("get", "https://api.github.com/user", token)
    r.raise_for_status()
    return r.json()["login"]


def create_or_get_repo(token, username, repo_name, description, private=False):
    """Devuelve la clone_url del repo (creándolo si no existe)."""
    r = api("get", f"https://api.github.com/repos/{username}/{repo_name}", token)
    if r.status_code == 200:
        print(f"    Repo '{repo_name}' ya existe en GitHub.")
        return r.json()["clone_url"]

    r = api("post", "https://api.github.com/user/repos", token, json={
        "name": repo_name,
        "description": description,
        "private": private,
        "auto_init": False
    })
    r.raise_for_status()
    print(f"    Repo '{repo_name}' creado en GitHub.")
    return r.json()["clone_url"]


def validate_upload(token, username, repo_name, required_files):
    """Comprueba que los archivos mínimos están en el repo de GitHub."""
    r = api("get", f"https://api.github.com/repos/{username}/{repo_name}/contents/", token)
    if r.status_code != 200:
        return False, f"No se pudo leer el contenido del repo (HTTP {r.status_code})"
    names = {item["name"] for item in r.json()}
    missing = [f for f in required_files if f not in names]
    if missing:
        return False, f"Archivos faltantes en GitHub: {missing}"
    return True, "OK"


def setup_git(directory, token, username, repo_name, gitignore_content):
    """Inicializa git, escribe .gitignore y configura el remote."""
    git_dir = directory / ".git"

    # Crear .gitignore si no existe
    gi_path = directory / ".gitignore"
    if not gi_path.exists():
        gi_path.write_text(gitignore_content, encoding="utf-8")
        print(f"    .gitignore creado.")

    # Inicializar repo si hace falta
    if not git_dir.exists():
        run("git init", cwd=directory)
        run(f'git config user.email "{GIT_EMAIL}"', cwd=directory)
        run(f'git config user.name "{GIT_USER_NAME}"', cwd=directory)
        # Forzar rama 'main'
        run("git checkout -b main", cwd=directory, check=False)
        print(f"    Git inicializado (rama: main).")

    # Configurar remote con token embebido en la URL
    remote_url = f"https://{token}@github.com/{username}/{repo_name}.git"
    existing = run("git remote", cwd=directory, check=False)
    if "origin" in existing.splitlines():
        run(f"git remote set-url origin {remote_url}", cwd=directory)
    else:
        run(f"git remote add origin {remote_url}", cwd=directory)
    print(f"    Remote 'origin' configurado.")


def commit_changes(directory, message):
    """Hace git add + commit. Devuelve True si hubo cambios."""
    run("git add .", cwd=directory)
    status = run("git status --porcelain", cwd=directory)
    if not status:
        print(f"    Sin cambios nuevos — nada que commitear.")
        return False
    run(f'git commit -m "{message}"', cwd=directory)
    print(f"    Commit creado.")
    return True


def push_to_github(directory):
    """Push con reintentos de rama main/master."""
    for branch in ("main", "master"):
        try:
            run(f"git push -u origin {branch} --force", cwd=directory)
            print(f"    Push exitoso (rama: {branch}).")
            return True
        except RuntimeError:
            continue
    raise RuntimeError("Push fallido en main y master.")


# =============================================================================
# DESPLIEGUE DE UNA VERSIÓN
# =============================================================================

def deploy(name, directory, repo_name, token, username,
           gitignore, required_files, description):
    """
    Despliega una versión a GitHub con retry.
    Devuelve (True, url) si OK, (False, mensaje_error) si fallo.
    """
    print(f"\n{'─'*55}")
    print(f"  DESPLEGANDO: {name}")
    print(f"{'─'*55}")

    last_error = ""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"\n  [Intento {attempt}/{MAX_RETRIES}]")

            print("  1. Creando/verificando repo en GitHub...")
            create_or_get_repo(token, username, repo_name, description)

            print("  2. Configurando git local...")
            setup_git(directory, token, username, repo_name, gitignore)

            print("  3. Preparando commit...")
            commit_message = "feat: versión inicial del Codificador Médico CDI"
            commit_changes(directory, commit_message)

            print("  4. Subiendo a GitHub...")
            push_to_github(directory)

            print("  5. Validando subida...")
            time.sleep(2)
            ok, msg = validate_upload(token, username, repo_name, required_files)
            if not ok:
                raise RuntimeError(f"Validación fallida — {msg}")

            url = f"https://github.com/{username}/{repo_name}"
            print(f"\n  ✓ {name} subido correctamente a {url}")
            return True, url

        except Exception as e:
            last_error = str(e)
            print(f"\n  ✗ Error: {last_error}")
            if attempt < MAX_RETRIES:
                print(f"  → Reintentando en {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)

    return False, last_error


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 55)
    print("  DEPLOY — CODIFICADOR MÉDICO CDI")
    print("=" * 55)

    # — Token —
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        print("\nNecesitas un Personal Access Token de GitHub.")
        print("Créalo en: https://github.com/settings/tokens")
        print("(Permisos: repo ✓)\n")
        token = getpass.getpass("Token: ").strip()
    if not token:
        print("[ERROR] Token vacío.")
        sys.exit(1)

    # — Verificar token —
    try:
        print("\nVerificando credenciales...")
        username = get_username(token)
        print(f"Autenticado como: {username}")
    except Exception as e:
        print(f"[ERROR] Token inválido — {e}")
        sys.exit(1)

    # — Despliegues —
    ok_web, res_web = deploy(
        name        = "Versión Web (HTML/JS)",
        directory   = STATIC_DIR,
        repo_name   = STATIC_REPO,
        token       = token,
        username    = username,
        gitignore   = STATIC_GITIGNORE,
        required_files = STATIC_REQUIRED,
        description = "Codificador Médico CDI · Versión web estática (HTML + JS + CSV)"
    )

    ok_java, res_java = deploy(
        name        = "Versión Java (Spring Boot)",
        directory   = JAVA_DIR,
        repo_name   = JAVA_REPO,
        token       = token,
        username    = username,
        gitignore   = JAVA_GITIGNORE,
        required_files = JAVA_REQUIRED,
        description = "Codificador Médico CDI · Versión Java Spring Boot + Maven"
    )

    # — Resumen —
    print(f"\n{'='*55}")
    print("  RESUMEN FINAL")
    print(f"{'='*55}")
    print(f"  {'✓' if ok_web  else '✗'} Web:  {res_web}")
    print(f"  {'✓' if ok_java else '✗'} Java: {res_java}")

    if ok_web and ok_java:
        print("\n¡Las dos versiones están en GitHub!")
    else:
        print("\n[ADVERTENCIA] Alguna versión falló. Revisa los errores.")
        sys.exit(1)


if __name__ == "__main__":
    main()

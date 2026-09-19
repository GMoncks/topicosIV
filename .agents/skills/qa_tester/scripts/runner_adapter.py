#!/usr/bin/env python3
"""
runner_adapter.py — Adaptador de execução de testes para qa_tester no projeto MIST.

Funcionalidades:
1. Parseia TESTS.md para extrair testes e seus metadados.
2. Executa testes reais via subprocess para pytest, vitest e playwright.
3. Normaliza a saída de cada runner para o schema comum do resultados.json.
4. Aplica escrita atômica (arquivo temporário + rename).
5. Mantém histórico FIFO das últimas 10 execuções por ID de teste.
"""

import sys
import os
import re
import json
import time
import tempfile
import datetime
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
TESTS_MD_PATH = ROOT_DIR / "TESTS.md"
RESULTADOS_JSON_PATH = ROOT_DIR / "resultados.json"


def parse_tests_md(category_filter=None, test_id_filter=None):
    if not TESTS_MD_PATH.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {TESTS_MD_PATH}")

    content = TESTS_MD_PATH.read_text(encoding="utf-8")
    lines = content.splitlines()

    tests = []
    current_category = None
    current_feature = None
    current_test = None

    category_regex = re.compile(r"^##\s+(?!Runners registrados)(.+)$")
    feature_regex = re.compile(r"^###\s+(.+)$")
    test_header_regex = re.compile(r"^####\s+([A-Za-z0-9_\-]+)\s+—\s+(.+)$")

    for line in lines:
        cat_match = category_regex.match(line)
        if cat_match:
            current_category = cat_match.group(1).strip()
            continue

        feat_match = feature_regex.match(line)
        if feat_match:
            current_feature = feat_match.group(1).strip()
            continue

        test_match = test_header_regex.match(line)
        if test_match:
            if current_test:
                tests.append(current_test)
            test_id = test_match.group(1).strip()
            title = test_match.group(2).strip()
            current_test = {
                "id": test_id,
                "title": title,
                "categoria": current_category,
                "funcionalidade": current_feature,
                "prioridade": "P1",
                "status": "planejado",
                "runner": "pytest",
                "comando": ""
            }
            continue

        if current_test:
            if line.strip().startswith("- Prioridade:"):
                current_test["prioridade"] = line.split(":", 1)[1].strip()
            elif line.strip().startswith("- Status:"):
                current_test["status"] = line.split(":", 1)[1].strip()
            elif line.strip().startswith("- Runner:"):
                current_test["runner"] = line.split(":", 1)[1].strip()
            elif line.strip().startswith("- Comando:"):
                cmd_raw = line.split(":", 1)[1].strip()
                current_test["comando"] = cmd_raw.strip("`").strip()

    if current_test:
        tests.append(current_test)

    # Filtragem
    filtered = []
    for t in tests:
        if test_id_filter and t["id"].lower() != test_id_filter.lower():
            continue
        if category_filter and t["categoria"].lower() != category_filter.lower():
            continue
        filtered.append(t)

    return filtered


def run_command(command, runner_name, cwd=ROOT_DIR):
    start_time = time.perf_counter()
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        success = (proc.returncode == 0)
        output = proc.stdout + "\n" + proc.stderr
        error_msg = None if success else (proc.stderr.strip() or proc.stdout.strip() or f"Process returned exit code {proc.returncode}")
        return {
            "status": "pass" if success else "fail",
            "duracao_ms": duration_ms,
            "erro": error_msg
        }
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "status": "fail",
            "duracao_ms": duration_ms,
            "erro": str(exc)
        }


def load_resultados():
    if not RESULTADOS_JSON_PATH.exists():
        return {}
    try:
        content = RESULTADOS_JSON_PATH.read_text(encoding="utf-8").strip()
        if not content:
            return {}
        return json.loads(content)
    except Exception:
        return {}


def atomic_save_resultados(data):
    parent_dir = RESULTADOS_JSON_PATH.parent
    fd, temp_file_path = tempfile.mkstemp(dir=parent_dir, prefix="res_", suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # Substituição atômica no SO
    os.replace(temp_file_path, RESULTADOS_JSON_PATH)


def execute_suite(category=None, test_id=None, origem="execucao"):
    tests = parse_tests_md(category_filter=category, test_id_filter=test_id)
    if not tests:
        print(f"[qa_tester] Nenhum teste encontrado com os critérios (categoria='{category}', id='{test_id}').")
        return

    resultados = load_resultados()
    run_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    print(f"[qa_tester] Iniciando processamento de {len(tests)} teste(s) [origem={origem}]...")

    for test in tests:
        t_id = test["id"]
        t_runner = test["runner"]
        t_status = test["status"]
        t_cmd = test["comando"]

        if t_id not in resultados:
            resultados[t_id] = {
                "runner": t_runner,
                "historico": []
            }
        else:
            resultados[t_id]["runner"] = t_runner

        if t_status == "planejado" or not t_cmd:
            entry = {
                "run_id": run_timestamp,
                "status": "pending",
                "duracao_ms": 0,
                "erro": None,
                "origem": origem
            }
            print(f" - [{t_id}] PENDING (planejado ou sem comando automatizado)")
        else:
            print(f" - [{t_id}] EXECUTANDO ({t_runner}): `{t_cmd}`")
            exec_res = run_command(t_cmd, t_runner)
            entry = {
                "run_id": run_timestamp,
                "status": exec_res["status"],
                "duracao_ms": exec_res["duracao_ms"],
                "erro": exec_res["erro"],
                "origem": origem
            }
            print(f"   └─ Resultado: {entry['status'].upper()} em {entry['duracao_ms']}ms")

        # Manter histórico FIFO das últimas 10 execuções
        historico = resultados[t_id].get("historico", [])
        historico.append(entry)
        if len(historico) > 10:
            historico = historico[-10:]
        resultados[t_id]["historico"] = historico

    # Escrita atômica garantida
    atomic_save_resultados(resultados)
    print(f"[qa_tester] Resultados salvos atomicamente em {RESULTADOS_JSON_PATH}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Executor de testes para a skill qa_tester")
    parser.add_argument("--categoria", help="Filtrar por categoria do TESTS.md")
    parser.add_argument("--id", help="Filtrar por ID de teste único")
    parser.add_argument("--origem", default="execucao", choices=["execucao", "validacao"], help="Origem da execução")

    args = parser.parse_args()
    execute_suite(category=args.categoria, test_id=args.id, origem=args.origem)

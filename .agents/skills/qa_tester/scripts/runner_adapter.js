const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../../..');
const TESTS_MD_PATH = path.join(ROOT_DIR, 'TESTS.md');
const RESULTADOS_JSON_PATH = path.join(ROOT_DIR, 'resultados.json');

function parseTestsMd(categoryFilter, testIdFilter) {
  if (!fs.existsSync(TESTS_MD_PATH)) {
    throw new Error(`Arquivo não encontrado: ${TESTS_MD_PATH}`);
  }

  const content = fs.readFileSync(TESTS_MD_PATH, 'utf-8');
  const lines = content.split(/\r?\n/);

  const tests = [];
  let currentCategory = null;
  let currentFeature = null;
  let currentTest = null;

  const categoryRegex = /^##\s+(?!Runners registrados)(.+)$/;
  const featureRegex = /^###\s+(.+)$/;
  const testHeaderRegex = /^####\s+([A-Za-z0-9_\-]+)\s+—\s+(.+)$/;

  for (const line of lines) {
    const catMatch = line.match(categoryRegex);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      continue;
    }

    const featMatch = line.match(featureRegex);
    if (featMatch) {
      currentFeature = featMatch[1].trim();
      continue;
    }

    const testMatch = line.match(testHeaderRegex);
    if (testMatch) {
      if (currentTest) tests.push(currentTest);
      currentTest = {
        id: testMatch[1].trim(),
        title: testMatch[2].trim(),
        categoria: currentCategory,
        funcionalidade: currentFeature,
        prioridade: 'P1',
        status: 'planejado',
        runner: 'pytest',
        comando: ''
      };
      continue;
    }

    if (currentTest) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- Prioridade:')) {
        currentTest.prioridade = trimmed.split(':', 2)[1].trim();
      } else if (trimmed.startsWith('- Status:')) {
        currentTest.status = trimmed.split(':', 2)[1].trim();
      } else if (trimmed.startsWith('- Runner:')) {
        currentTest.runner = trimmed.split(':', 2)[1].trim();
      } else if (trimmed.startsWith('- Comando:')) {
        const rawCmd = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        currentTest.comando = rawCmd.replace(/^`|`$/g, '').trim();
      }
    }
  }

  if (currentTest) tests.push(currentTest);

  return tests.filter(t => {
    if (testIdFilter && t.id.toLowerCase() !== testIdFilter.toLowerCase()) return false;
    if (categoryFilter && t.categoria.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    return true;
  });
}

function runCommand(command, cwd = ROOT_DIR) {
  const startTime = Date.now();
  try {
    const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    const durationMs = Date.now() - startTime;
    return { status: 'pass', duracao_ms: durationMs, erro: null };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = (error.stderr || error.stdout || error.message || 'Process failed').trim();
    return { status: 'fail', duracao_ms: durationMs, erro: errorMsg };
  }
}

function loadResultados() {
  if (!fs.existsSync(RESULTADOS_JSON_PATH)) return {};
  try {
    const content = fs.readFileSync(RESULTADOS_JSON_PATH, 'utf-8').trim();
    return content ? JSON.parse(content) : {};
  } catch (err) {
    return {};
  }
}

function atomicSaveResultados(data) {
  const tempPath = path.join(ROOT_DIR, `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.tmp`);
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, RESULTADOS_JSON_PATH);
}

function executeSuite({ category, testId, origem = 'execucao' }) {
  const tests = parseTestsMd(category, testId);
  if (tests.length === 0) {
    console.log(`[qa_tester] Nenhum teste encontrado com os critérios (categoria='${category}', id='${testId}').`);
    return;
  }

  const resultados = loadResultados();
  const runTimestamp = new Date().toISOString();

  console.log(`[qa_tester] Iniciando processamento de ${tests.length} teste(s) [origem=${origem}]...`);

  for (const test of tests) {
    const { id: t_id, runner: t_runner, status: t_status, comando: t_cmd } = test;

    if (!resultados[t_id]) {
      resultados[t_id] = { runner: t_runner, historico: [] };
    } else {
      resultados[t_id].runner = t_runner;
    }

    let entry;
    if (t_status === 'planejado' || !t_cmd) {
      entry = {
        run_id: runTimestamp,
        status: 'pending',
        duracao_ms: 0,
        erro: null,
        origem
      };
      console.log(` - [${t_id}] PENDING (planejado ou sem comando automatizado)`);
    } else {
      console.log(` - [${t_id}] EXECUTANDO (${t_runner}): \`${t_cmd}\``);
      const execRes = runCommand(t_cmd);
      entry = {
        run_id: runTimestamp,
        status: execRes.status,
        duracao_ms: execRes.duracao_ms,
        erro: execRes.erro,
        origem
      };
      console.log(`   └─ Resultado: ${entry.status.toUpperCase()} em ${entry.duracao_ms}ms`);
    }

    let historico = resultados[t_id].historico || [];
    historico.push(entry);
    if (historico.length > 5) {
      historico = historico.slice(-5);
    }
    resultados[t_id].historico = historico;
  }

  atomicSaveResultados(resultados);
  console.log(`[qa_tester] Resultados salvos atomicamente em ${RESULTADOS_JSON_PATH}`);
}

const args = process.argv.slice(2);
let category = null;
let testId = null;
let origem = 'execucao';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--categoria' && args[i + 1]) category = args[++i];
  if (args[i] === '--id' && args[i + 1]) testId = args[++i];
  if (args[i] === '--origem' && args[i + 1]) origem = args[++i];
}

executeSuite({ category, testId, origem });

// Converte teoria/teoria-X-ano.md (texto escrito para o jogo) em JSON que o jogo carrega em tempo de
// execução. Não reescreve o conteúdo: só estrutura o que já está escrito nos cadernos markdown.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'cidade', 'public', 'theory');
fs.mkdirSync(OUT_DIR, { recursive: true });

// "Teoria", "Passo a passo" e "Quiz" são títulos de bloco (**Título**, depois o texto na linha seguinte).
function section(block, label) {
  const m = block.match(new RegExp(`\\*\\*${label}\\*\\*\\n([\\s\\S]*?)(?=\\n\\*\\*[A-ZÀ-Ú]|$)`));
  return m ? m[1].trim() : '';
}
// "Fique ligado", "Pense e converse" e "Desafio de movimento" vêm em uma linha só: **Título:** texto.
function inline(block, label) {
  const m = block.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
  return m ? m[1].trim() : '';
}
function paragraphs(text) {
  return text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
}
function steps(text) {
  return [...text.matchAll(/^\d+\.\s*(.+)$/gm)].map(m => m[1].trim());
}
function parseQuiz(block) {
  const m = block.match(/\*\*Quiz\*\*\n([\s\S]*)$/);
  if (!m) throw new Error('No quiz found');
  // A alternativa c) às vezes já termina em "?" (quando ela mesma é uma pergunta), então o ponto final
  // antes de "**Resposta" é opcional, não obrigatório.
  const re = /^\d+\.\s*(.+?)\s*a\)\s*(.+?)\s*b\)\s*(.+?)\s*c\)\s*(.+?)\.?\s*\*\*Resposta:\s*([abc])\.\*\*/gm;
  const out = [];
  let mm;
  while ((mm = re.exec(m[1]))) {
    const [, question, a, b, c, letter] = mm;
    out.push({ question: question.trim(), options: [a.trim(), b.trim(), c.trim()], correct: { a: 0, b: 1, c: 2 }[letter] });
  }
  if (out.length !== 3) throw new Error('Expected 3 quiz questions, found ' + out.length + ': ' + m[1].slice(0, 200));
  return out;
}

function parseGrade(file, grade) {
  const text = fs.readFileSync(file, 'utf-8');
  const units = [];
  const unitBlocks = text.split(/^## /m).slice(1);
  for (const ub of unitBlocks) {
    const unitTitle = ub.split('\n')[0].trim();
    const weeks = [];
    const weekBlocks = ub.split(/^### /m).slice(1);
    for (const wb of weekBlocks) {
      const [titleLine, ...rest] = wb.split('\n');
      const weekMatch = titleLine.match(/^Semana (\d+)\s*·\s*(.+?)\s*$/);
      if (!weekMatch) throw new Error('Bad week title: ' + titleLine);
      const body = rest.join('\n');
      const objective = (body.match(/\*\*Objetivo:\*\*\s*(.+)/) || [, ''])[1].trim();
      const theory = paragraphs(section(body, 'Teoria'));
      const stepList = steps(section(body, 'Passo a passo'));
      const safety = inline(body, 'Fique ligado');
      const discuss = inline(body, 'Pense e converse');
      const challenge = inline(body, 'Desafio de movimento');
      const week = {
        number: Number(weekMatch[1]), title: weekMatch[2].trim(), objective, theory, steps: stepList,
        safety, discuss, challenge, quiz: parseQuiz(body),
      };
      for (const [key, value] of Object.entries(week))
        if (value === '' || (Array.isArray(value) && value.length === 0))
          throw new Error(`${file} semana ${week.number}: campo "${key}" veio vazio — texto não bateu com o formato esperado`);
      weeks.push(week);
    }
    units.push({ title: unitTitle.replace(/\s*\(.+\)\s*$/, ''), place: (unitTitle.match(/\(([^)]+)\)\s*$/) || [, ''])[1], weeks });
  }
  const totalWeeks = units.reduce((n, u) => n + u.weeks.length, 0);
  if (totalWeeks !== 15) throw new Error(`${file}: expected 15 weeks total, found ${totalWeeks}`);
  return { grade, units };
}

const grades = [6, 7, 8, 9];
const index = [];
for (const grade of grades) {
  const file = path.join(ROOT, 'teoria', `teoria-${grade}-ano.md`);
  const data = parseGrade(file, grade);
  fs.writeFileSync(path.join(OUT_DIR, `grade-${grade}.json`), JSON.stringify(data));
  index.push({ grade, units: data.units.length, weeks: data.units.reduce((n, u) => n + u.weeks.length, 0) });
  console.log(`grade ${grade}: ${data.units.length} units, ${data.units.reduce((n, u) => n + u.weeks.length, 0)} weeks`);
}
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index));
console.log('OK');

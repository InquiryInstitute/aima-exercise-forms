import * as vscode from 'vscode';

export interface ParsedExercise {
  questionText: string;
  answerText: string;
  /** Range of the answer in the document (for in-place replace). If no answer block, full content range. */
  answerRange: vscode.Range;
  /** If true, file had no <!-- answer --> block; we will append one on save. */
  answerAppend: boolean;
  /** Title from first heading if present. */
  title?: string;
}

const MD_QUESTION_START = '<!-- question -->';
const MD_QUESTION_END = '<!-- /question -->';
const MD_ANSWER_START = '<!-- answer -->';
const MD_ANSWER_END = '<!-- /answer -->';

/**
 * Parse Markdown content for question/answer blocks.
 * Convention: <!-- question --> ... <!-- /question --> and <!-- answer --> ... <!-- /answer -->.
 * If no question block, questionText is empty. If no answer block, answerText is full file and answerAppend is true.
 */
export function parseMarkdown(
  content: string,
  doc: vscode.TextDocument
): ParsedExercise {
  const text = doc.getText();
  const lines = text.split(/\r?\n/);
  let questionText = '';
  let answerText = '';
  let answerStartLine = 0;
  let answerStartChar = 0;
  let answerEndLine = lines.length - 1;
  let answerEndChar = lines[lines.length - 1]?.length ?? 0;
  let answerAppend = false;
  let title: string | undefined;

  let i = 0;
  let charOffset = 0;

  while (i < lines.length) {
    const line = lines[i];
    const lineEnd = charOffset + line.length;

    // Capture first ## heading as title
    if (!title && /^##\s+/.test(line)) {
      title = line.replace(/^##\s+/, '').trim();
    }

    if (line.trim() === MD_QUESTION_START) {
      i++;
      charOffset = lineEnd + 1;
      const start = i;
      while (i < lines.length && lines[i].trim() !== MD_QUESTION_END) {
        i++;
      }
      questionText = lines.slice(start, i).join('\n').trim();
      i++;
      charOffset = 0;
      for (let j = 0; j <= i && j < lines.length; j++) {
        charOffset += lines[j].length + 1;
      }
      continue;
    }

    if (line.trim() === MD_ANSWER_START) {
      i++;
      const start = i;
      const contentStartLine = i;
      const contentStartChar = 0;
      while (i < lines.length && lines[i].trim() !== MD_ANSWER_END) {
        i++;
      }
      const endLine = i - 1;
      const endChar = endLine >= 0 ? lines[endLine].length : 0;
      answerText = lines.slice(start, i).join('\n');
      answerStartLine = contentStartLine;
      answerStartChar = contentStartChar;
      answerEndLine = endLine;
      answerEndChar = endChar;
      i++;
      charOffset = 0;
      for (let j = 0; j <= i && j < lines.length; j++) {
        charOffset += lines[j].length + 1;
      }
      continue;
    }

    i++;
    charOffset = lineEnd + 1;
  }

  if (answerText === '' && questionText === '') {
    answerText = content;
    answerAppend = true;
    answerStartLine = 0;
    answerStartChar = 0;
    answerEndLine = lines.length - 1;
    answerEndChar = lines[lines.length - 1]?.length ?? 0;
  } else if (answerText === '' && questionText !== '') {
    answerText = '';
    answerAppend = true;
    answerStartLine = lines.length - 1;
    answerStartChar = lines[lines.length - 1]?.length ?? 0;
    answerEndLine = answerStartLine;
    answerEndChar = answerStartChar;
  }

  const answerRange = new vscode.Range(
    answerStartLine,
    answerStartChar,
    answerEndLine,
    answerEndChar
  );

  return {
    questionText,
    answerText,
    answerRange,
    answerAppend,
    title,
  };
}

const ADOC_QUESTION = '.Question';
const ADOC_ANSWER = '.Answer';

/**
 * Parse AsciiDoc content for .Question and .Answer blocks.
 */
export function parseAdoc(
  content: string,
  doc: vscode.TextDocument
): ParsedExercise {
  const text = doc.getText();
  const lines = text.split(/\r?\n/);
  let questionText = '';
  let answerText = '';
  let answerStartLine = 0;
  let answerStartChar = 0;
  let answerEndLine = lines.length - 1;
  let answerEndChar = lines[lines.length - 1]?.length ?? 0;
  let answerAppend = false;
  let title: string | undefined;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^==\s+/.test(line) && !title) {
      title = line.replace(/^==\s+/, '').trim();
    }
    if (line.trim() === ADOC_QUESTION) {
      i++;
      const start = i;
      while (i < lines.length && !lines[i].trim().startsWith('.')) {
        i++;
      }
      questionText = lines.slice(start, i).join('\n').trim();
      continue;
    }
    if (line.trim() === ADOC_ANSWER) {
      answerStartLine = i;
      answerStartChar = 0;
      i++;
      const start = i;
      while (i < lines.length && !lines[i].trim().startsWith('.')) {
        i++;
      }
      answerText = lines.slice(start, i).join('\n').trim();
      answerEndLine = i - 1;
      answerEndChar = lines[i - 1]?.length ?? 0;
      i++;
      continue;
    }
    i++;
  }

  if (answerText === '' && questionText === '') {
    answerText = content;
    answerAppend = true;
    answerEndLine = lines.length - 1;
    answerEndChar = lines[lines.length - 1]?.length ?? 0;
  } else if (answerText === '' && questionText !== '') {
    answerText = '';
    answerAppend = true;
    answerStartLine = lines.length - 1;
    answerStartChar = lines[lines.length - 1]?.length ?? 0;
    answerEndLine = answerStartLine;
    answerEndChar = answerStartChar;
  }

  const answerRange = new vscode.Range(
    answerStartLine,
    answerStartChar,
    answerEndLine,
    answerEndChar
  );

  return {
    questionText,
    answerText,
    answerRange,
    answerAppend,
    title,
  };
}

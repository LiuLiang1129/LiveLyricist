/**
 * Splits raw lyrics into lines based on punctuation and target length.
 * Focuses on maintaining semantic meaning where possible.
 */
export const splitLyrics = (raw: string, targetLen: number): string[] => {
  if (!raw) return [];

  // Protect common abbreviations and initials
  // We replace the period with a null character temporarily
  const protectedRaw = raw
    .replace(/\b(Mr|Mrs|Ms|Dr|Sr|Jr|St|Vs|Prof|Gen|Rep|Sen)\./gi, '$1\u0000')
    .replace(/\b([A-Z])\./g, '$1\u0000'); // Initials

  const lines: string[] = [];
  const paragraphs = protectedRaw.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      continue;
    }

    processSegment(trimmed, targetLen, lines);
  }

  // Restore periods
  return lines.map(line => line.replace(/\u0000/g, '.'));
};

const processSegment = (text: string, limit: number, accumulator: string[]) => {
  // Tolerance allows slightly longer lines if they are complete semantic units
  const maxLen = Math.max(limit * 1.5, limit + 5); 

  if (text.length <= maxLen) {
    accumulator.push(text);
    return;
  }

  // Strategy 1: Split by Major Punctuation (. ? !)
  // Capture the punctuation. Lookahead ensures we usually break at sentence boundaries.
  if (trySplitAndReflow(text, /([.!?！？]+)(?=\s|$)/, limit, accumulator)) return;

  // Strategy 2: Split by Minor Punctuation (, ; : -- ...)
  // We check for " - " (spaced hyphen) usually used as parenthetical.
  // We do NOT split on single hyphens inside words (e.g. "semi-detached").
  if (trySplitAndReflow(text, /([,，;；:：]|\s[-–—]+\s|\.\.\.)(?=\s|$)/, limit, accumulator)) return;

  // Strategy 3: Split by Space (Balanced/Greedy)
  // Find the best space to split at.
  let splitIndex = findBestSplitIndex(text, limit);

  // If we couldn't find a good split point, just cut at limit
  if (splitIndex === -1) splitIndex = limit;

  const head = text.substring(0, splitIndex).trim();
  const tail = text.substring(splitIndex).trim();

  if (head) accumulator.push(head);
  if (tail) processSegment(tail, limit, accumulator);
};

const trySplitAndReflow = (text: string, separatorRegex: RegExp, limit: number, accumulator: string[]): boolean => {
  const parts = text.split(separatorRegex);
  
  // If no split occurred (length 1), or just a delimiter at end (length 3 with empty end), 
  // we might not have effectively split the semantic structure. 
  // Regex split with capturing group returns [text, sep, text, sep...].
  if (parts.length < 3) return false;

  const atoms: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i];
    const sep = parts[i + 1] || "";
    const combined = (content + sep).trim();
    if (combined) atoms.push(combined);
  }
  
  // If we only have one atom after trimming, splitting didn't break it internally
  if (atoms.length < 2) return false;

  let currentLine = "";

  for (const atom of atoms) {
    // If adding this atom fits within tolerance...
    // We use a slightly tighter tolerance for re-flow to encourage wrapping
    if (currentLine && (currentLine.length + 1 + atom.length) <= limit * 1.3) {
      currentLine += (currentLine ? " " : "") + atom;
    } else {
      if (currentLine) {
        accumulator.push(currentLine);
      }
      
      // If the atom itself is huge, we need to process it recursively.
      if (atom.length > limit * 1.5) {
        processSegment(atom, limit, accumulator);
        currentLine = ""; 
      } else {
        currentLine = atom;
      }
    }
  }

  if (currentLine) {
    accumulator.push(currentLine);
  }

  return true;
};

const findBestSplitIndex = (text: string, limit: number): number => {
  // Look for a space before the limit
  let index = text.lastIndexOf(' ', limit);
  
  // If found space is too early (e.g. "A [very long word]"), creating a tiny orphan line "A",
  // we might want to check if there is a space just AFTER the limit.
  if (index < limit * 0.4) { 
     const nextSpace = text.indexOf(' ', limit);
     if (nextSpace !== -1 && nextSpace <= limit * 1.4) {
         return nextSpace;
     }
  }

  // If absolutely no space found before limit
  if (index === -1) {
    // Try to find one after limit within reason
    const nextSpace = text.indexOf(' ', limit);
    if (nextSpace !== -1 && nextSpace <= limit * 1.4) {
      return nextSpace;
    }
    // No space found nearby, return -1 to signal hard cut
    return -1;
  }

  return index;
};
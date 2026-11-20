// scripts/test-chat-followups.ts
// Run: npx tsx scripts/test-chat-followups.ts
// The follow-up chips that ride in the same /api/ai/chat response as the answer
// (src/features/chat/chatFollowups.ts): server-side stream splitting and the
// client-side split, including chunk boundaries inside the marker.
import {
  FOLLOWUPS_MARKER,
  FOLLOWUPS_SEPARATOR,
  FollowupStreamSplitter,
  splitChatResponse,
} from '../src/features/chat/chatFollowups';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string): void {
  if (cond) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}`); }
}

/** Runs the model text through the server splitter in the given chunk sizes
 *  and returns what the client would receive, plus whether any answer text was
 *  sent before the end of the stream (i.e. it still streams). */
function serve(modelText: string, chunkSize: number): { wire: string; streamedEarly: boolean } {
  const splitter = new FollowupStreamSplitter();
  let wire = '';
  for (let i = 0; i < modelText.length; i += chunkSize) {
    wire += splitter.push(modelText.slice(i, i + chunkSize));
  }
  const streamedEarly = wire.length > 0;
  const { text, trailer } = splitter.finish();
  wire += text + trailer;
  return { wire, streamedEarly };
}

const answer = 'ריבית דריבית היא ריבית על הריבית.\nככה הכסף גדל מהר יותר.';
const tail = `\n${FOLLOWUPS_MARKER}\n["איך מחשבים את זה?", "כמה זמן לוקח?"]`;

for (const size of [1, 2, 3, 5, 7, 13, 1000]) {
  const { wire, streamedEarly } = serve(answer + tail, size);
  const { answer: got, followups } = splitChatResponse(wire);
  check(got === answer, `chunk ${size}: answer intact, marker and chips removed`);
  check(followups?.[0] === 'איך מחשבים את זה?' && followups?.[1] === 'כמה זמן לוקח?', `chunk ${size}: chips parsed`);
  check(!wire.includes(FOLLOWUPS_MARKER), `chunk ${size}: marker never reaches the client`);
  if (size < 50) check(streamedEarly, `chunk ${size}: answer still streams before the end`);
}

{
  // The model forgot the marker: everything is answer, no trailer.
  const { wire } = serve(answer, 4);
  check(wire === answer, 'no marker: answer passes through unchanged');
  const { answer: got, followups } = splitChatResponse(wire);
  check(got === answer && followups === null, 'no marker: no chips, answer unchanged');
}

{
  // Answer text that merely starts like the marker is not held back for good.
  const text = 'שימו לב @@ זה לא סימן';
  const { wire } = serve(text, 3);
  check(wire === text, 'partial marker look-alike is released at the end');
}

{
  // Marker present but the array is broken: answer kept, no chips, no junk.
  const { wire } = serve(`${answer}\n${FOLLOWUPS_MARKER}\n["רק שאלה אחת?"]`, 6);
  const { answer: got, followups } = splitChatResponse(wire);
  check(got === answer && followups === null, 'one question only: no chips, answer clean');
  check(!wire.includes(FOLLOWUPS_SEPARATOR), 'one question only: no trailer sent');
}

{
  // Fenced array after the marker is tolerated.
  const { wire } = serve(`${answer}\n${FOLLOWUPS_MARKER}\n\`\`\`json\n["א?", "ב?"]\n\`\`\``, 5);
  const { followups } = splitChatResponse(wire);
  check(followups?.[0] === 'א?' && followups?.[1] === 'ב?', 'fenced array parsed');
}

{
  // The model skipped the marker but ended with the bare array on its own line.
  const { answer: got, followups } = splitChatResponse(`${answer}\n["א?", "ב?"]`);
  check(got === answer && followups?.[1] === 'ב?', 'bare trailing array: taken as chips, not shown');
}

{
  // An old server (or a client that didn't ask) never sends a trailer.
  const { answer: got, followups } = splitChatResponse('תשובה רגילה [עם סוגריים] באמצע');
  check(got === 'תשובה רגילה [עם סוגריים] באמצע' && followups === null, 'plain answer with brackets untouched');
}

{
  // Malformed trailer: the answer survives.
  const { answer: got, followups } = splitChatResponse(`${answer}${FOLLOWUPS_SEPARATOR}{not json`);
  check(got === answer && followups === null, 'malformed trailer: answer kept, no chips');
}

// ── Markdown around the marker / loose markers (boot review 20.11) ──────────
// Each runs through the real (deployed) server splitter first, then the client.
const chips = '["איך מחשבים את זה?", "כמה זמן לוקח?"]';

{
  const { wire } = serve(`${answer}\n**${FOLLOWUPS_MARKER}**\n${chips}`, 4);
  const { answer: got, followups } = splitChatResponse(wire);
  check(got === answer, 'bold marker: no stray ** left in the answer');
  check(followups?.[1] === 'כמה זמן לוקח?', 'bold marker: chips parsed');
}

{
  const { wire } = serve(`${answer}\n\`\`\`\n${FOLLOWUPS_MARKER}\n${chips}\n\`\`\``, 5);
  const { answer: got, followups } = splitChatResponse(wire);
  check(got === answer, 'marker inside a code fence: no dangling ``` left');
  check(followups?.[0] === 'איך מחשבים את זה?', 'marker inside a code fence: chips parsed');
}

{
  const { wire } = serve(`${answer}\n\`\`\`json\n${FOLLOWUPS_MARKER}\n${chips}\n\`\`\``, 7);
  const { answer: got } = splitChatResponse(wire);
  check(got === answer, 'marker inside a ```json fence: no dangling fence left');
}

{
  // The server only knows the exact marker: a loosely written one reaches the
  // client as text, with no trailer. The client cuts it.
  for (const loose of ['@@ FOLLOWUPS @@', '@@followups@@', '@@FOLLOWUP@@', '@@ Follow-Ups @@']) {
    const { wire } = serve(`${answer}\n${loose}\n${chips}`, 6);
    check(!wire.includes(FOLLOWUPS_SEPARATOR), `loose marker "${loose}": server sends no trailer`);
    const { answer: got, followups } = splitChatResponse(wire);
    check(got === answer, `loose marker "${loose}": hidden from the answer`);
    check(followups?.[0] === 'איך מחשבים את זה?', `loose marker "${loose}": chips still parsed`);
  }
}

{
  const { wire } = serve(`${answer}\n**@@ FOLLOWUPS @@**\n${chips}`, 3);
  const { answer: got, followups } = splitChatResponse(wire);
  check(got === answer && followups !== null, 'bold loose marker: hidden, no ** left, chips parsed');
}

{
  // Marker on the same line as the last sentence, wrapped in bold.
  const { wire } = serve(`${answer} **${FOLLOWUPS_MARKER}** ${chips}`, 9);
  const { answer: got } = splitChatResponse(wire);
  check(got === answer, 'inline bold marker: unpaired ** glued to the answer removed');
}

{
  // Balanced markdown at the end of a real answer is left alone.
  const withCode = 'דוגמה:\n```\nx = 1\n```';
  const { wire } = serve(`${withCode}\n${FOLLOWUPS_MARKER}\n${chips}`, 4);
  check(splitChatResponse(wire).answer === withCode, 'closed code block at the end kept');
  const withBold = 'השורה האחרונה **מודגשת**';
  const { wire: wire2 } = serve(`${withBold}\n${FOLLOWUPS_MARKER}\n${chips}`, 4);
  check(splitChatResponse(wire2).answer === withBold, 'balanced bold at the end kept');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

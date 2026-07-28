// LEVIATHAN . THE QUIZ - between the terms and the curtain.
// Asks 2+2. The RIGHT answer is an EMPTY submit. Any text = the trap:
// a fake transcript.html that loads slow as hell, then a curtain that
// never opens. window.LVQuiz.run() resolves only on the empty submit.
(function () {
  if (window.LVQuiz) return;
  var TRAP_MS = 90000; // 90s of fake loading

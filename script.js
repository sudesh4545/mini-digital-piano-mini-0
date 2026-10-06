(function () {
        "use strict";
        var notes = [
            "C4",
            "C#4",
            "D4",
            "D#4",
            "E4",
            "F4",
            "F#4",
            "G4",
            "G#4",
            "A4",
            "A#4",
            "B4",
            "C5",
            "C#5",
            "D5",
            "D#5",
            "E5",
          ],
          keys = [
            "a",
            "w",
            "s",
            "e",
            "d",
            "f",
            "t",
            "g",
            "y",
            "h",
            "u",
            "j",
            "k",
            "o",
            "l",
            "p",
            ";",
          ],
          ctx,
          master,
          active = {},
          recording = false,
          recorded = [],
          recordStart = 0,
          timeouts = [],
          $ = function (x) {
            return document.getElementById(x);
          },
          keyboard = $("keyboard"),
          status = $("status");
        function audio() {
          if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.connect(ctx.destination);
          }
          master.gain.value = +$("volume").value;
          if (ctx.state === "suspended") ctx.resume();
        }
        function frequency(note) {
          var names = {
              C: 0,
              "C#": 1,
              D: 2,
              "D#": 3,
              E: 4,
              F: 5,
              "F#": 6,
              G: 7,
              "G#": 8,
              A: 9,
              "A#": 10,
              B: 11,
            },
            m = 12 * (parseInt(note.slice(-1)) + 1) + names[note.slice(0, -1)];
          return 440 * Math.pow(2, (m - 69) / 12);
        }
        function down(note, fromReplay) {
          if (active[note] && !fromReplay) return;
          audio();
          var o = ctx.createOscillator(),
            g = ctx.createGain();
          o.type = $("wave").value;
          o.frequency.value = frequency(note);
          g.gain.setValueAtTime(0.001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
          o.connect(g).connect(master);
          o.start();
          active[note] = { o: o, g: g };
          var k = document.querySelector('[data-note="' + note + '"]');
          if (k) k.classList.add("active");
          if (recording && !fromReplay)
            recorded.push({
              note: note,
              on: true,
              t: performance.now() - recordStart,
            });
        }
        function up(note, fromReplay) {
          var v = active[note];
          if (!v) return;
          v.g.gain.cancelScheduledValues(ctx.currentTime);
          v.g.gain.setTargetAtTime(0.001, ctx.currentTime, 0.06);
          v.o.stop(ctx.currentTime + 0.3);
          delete active[note];
          var k = document.querySelector('[data-note="' + note + '"]');
          if (k) k.classList.remove("active");
          if (recording && !fromReplay)
            recorded.push({
              note: note,
              on: false,
              t: performance.now() - recordStart,
            });
        }
        notes.forEach(function (note, i) {
          var b = document.createElement("button");
          b.className = "key " + (note.indexOf("#") > 0 ? "black" : "white");
          b.dataset.note = note;
          b.innerHTML =
            "<span>" + note + " · " + keys[i].toUpperCase() + "</span>";
          b.onpointerdown = function (ev) {
            ev.preventDefault();
            down(note);
          };
          b.onpointerup =
            b.onpointercancel =
            b.onpointerleave =
              function () {
                up(note);
              };
          keyboard.appendChild(b);
        });
        document.addEventListener("keydown", function (ev) {
          if (ev.repeat || /input|select/i.test(ev.target.tagName)) return;
          var i = keys.indexOf(ev.key.toLowerCase());
          if (i >= 0) {
            ev.preventDefault();
            down(notes[i]);
          }
        });
        document.addEventListener("keyup", function (ev) {
          var i = keys.indexOf(ev.key.toLowerCase());
          if (i >= 0) up(notes[i]);
        });
        window.addEventListener("blur", function () {
          Object.keys(active).forEach(function (n) {
            up(n);
          });
        });
        $("record").onclick = function () {
          audio();
          recording = !recording;
          $("record").classList.toggle("recording", recording);
          $("record").textContent = recording ? "■ Stop" : "● Record";
          if (recording) {
            recorded = [];
            recordStart = performance.now();
            status.textContent = "Recording your performance…";
          } else
            status.textContent = recorded.length
              ? "Recording ready — press Replay."
              : "Nothing was recorded.";
        };
        $("play").onclick = function () {
          if (!recorded.length)
            return (status.textContent = "Record a short performance first.");
          recording = false;
          $("record").classList.remove("recording");
          $("record").textContent = "● Record";
          timeouts.forEach(clearTimeout);
          timeouts = recorded.map(function (ev) {
            return setTimeout(function () {
              ev.on ? down(ev.note, true) : up(ev.note, true);
            }, ev.t);
          });
          status.textContent =
            "Replaying " +
            Math.round(recorded.at(-1).t / 1000) +
            " second performance.";
        };
        $("clear").onclick = function () {
          timeouts.forEach(clearTimeout);
          recorded = [];
          Object.keys(active).forEach(function (n) {
            up(n, true);
          });
          status.textContent = "Recording cleared.";
        };
        $("volume").oninput = function () {
          if (master) master.gain.value = +$("volume").value;
        };
      })();

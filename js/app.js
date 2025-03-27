const firebaseConfig = {
  apiKey: "AIzaSyABQpgRnutwoXbYf6LbVXnDfBgHpmW2ZFs",
  authDomain: "comme-les-francais.firebaseapp.com",
  databaseURL: "https://comme-les-francais-default-rtdb.firebaseio.com",
  projectId: "comme-les-francais",
  storageBucket: "comme-les-francais.appspot.com",
  messagingSenderId: "946947303900",
  appId: "1:946947303900:web:701e52ba9db8cbf75d4719",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.getElementById("backBtn").addEventListener("click", () => {
  document.getElementById("practiceScreen").classList.add("hidden");
  document.getElementById("categoryScreen").classList.remove("hidden");
});

let words = {}; 

fetch("data/words.json")
  .then((response) => response.json())
  .then((data) => {
    words = data;
    initCategories(); 
  });

let currentCategory = null;
let currentWordIndex = 0;
let mediaRecorder;
let audioChunks = [];

function initCategories() {
  const container = document.getElementById("categories");
  const user = JSON.parse(localStorage.getItem("user"));

  Object.keys(words).forEach((category) => {
    const button = document.createElement("button");
    button.classList.add("category-btn");

    const img = document.createElement("img");
    img.src = `assets/${category}.png`;
    img.alt = category;
    button.appendChild(img);

    // Label
    const label = category
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());

    const span = document.createElement("span");
    span.textContent = label.toUpperCase();
    button.appendChild(span);

    // Add progress bar container
    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-container";
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressContainer.appendChild(progressBar);
    button.appendChild(progressContainer);

    // Add click listener
    button.addEventListener("click", () => startPractice(category));
    container.appendChild(button);

    // Fetch user progress for this category
    if (user && user.uid) {
      const wordScoreRef = firebase
        .database()
        .ref(`users/${user.uid}/wordScores`);
      wordScoreRef.once("value", (snapshot) => {
        const scores = snapshot.val() || {};
        const categoryWords = words[category];
        const mastered = categoryWords.filter(
          (w) => scores[w.french.toLowerCase()] >= 3
        ).length;
        const percentage = Math.round((mastered / categoryWords.length) * 100);
        progressBar.style.width = `${percentage}%`;
        progressBar.title = `${mastered}/${categoryWords.length} mastered`;
      });
    }
  });

  // Leaderboard Button
  const leaderboardBtn = document.createElement("button");
  const img = document.createElement("img");
  img.src = `/assets/leaderboard.png`;
  img.alt = "Leaderboard";
  leaderboardBtn.appendChild(img);
  const span = document.createElement("span");
  span.textContent = "LEADERBOARD";
  leaderboardBtn.appendChild(span);
  leaderboardBtn.addEventListener("click", () => {
    window.location.href = "leaderboard.html";
  });
  container.appendChild(leaderboardBtn);
}

function startPractice(category) {
  currentCategory = category;

  // Restore last index if available
  const savedIndex = parseInt(localStorage.getItem(`lastIndex_${category}`));
  currentWordIndex = !isNaN(savedIndex) ? savedIndex : 0;

  document.getElementById("categoryScreen").classList.add("hidden");
  document.getElementById("practiceScreen").classList.remove("hidden");
  showCurrentWord();
}

function showCurrentWord() {
  const wordData = words[currentCategory][currentWordIndex];
  const targetWord = wordData.french;
  const wordKey = targetWord.toLowerCase();

  const wordElement = document.getElementById("frenchWord");
  const translationElement = document.getElementById("translation");
  const counterElement = document.getElementById("wordCounter");
  const feedback = document.getElementById("feedback");

  // Reset base display first
  wordElement.innerHTML = targetWord;
  translationElement.textContent = wordData.english;
  counterElement.textContent = `${currentWordIndex + 1}/${
    words[currentCategory].length
  }`;

  feedback.className = "feedback";
  feedback.textContent = "";

  // Save current index
  localStorage.setItem(`lastIndex_${currentCategory}`, currentWordIndex);

  // Check Firebase for trophy
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.uid) {
    const wordScoreRef = firebase
      .database()
      .ref(`users/${user.uid}/wordScores/${wordKey}`);
    wordScoreRef.once("value", (snapshot) => {
      const score = snapshot.val() || 0;
      if (score >= 3) {
        wordElement.innerHTML = `${targetWord} <span title="Mastered" style="color:#007bff;">🏆</span>`;
      }
    });
  }
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentWordIndex > 0) {
    currentWordIndex--;
    showCurrentWord();
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentWordIndex < words[currentCategory].length - 1) {
    currentWordIndex++;
    showCurrentWord();
  }
});

document.getElementById("playBtn").addEventListener("click", () => {
  if (isRecognizing) {
    // Prevent cheating while recording
    const feedback = document.getElementById("feedback");
    feedback.textContent = "🚫 Veuillez terminer l'enregistrement d'abord.";
    return;
  }

  const word = words[currentCategory][currentWordIndex].french;
  const utterance = new SpeechSynthesisUtterance(word);

  // Set preferred language and voice
  const voices = window.speechSynthesis.getVoices();
  const frenchVoices = voices.filter((voice) => voice.lang.startsWith("fr"));

  // Choose a more pleasant voice if available
  const preferredVoice =
    frenchVoices.find((v) => v.name.includes("Google")) || frenchVoices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.lang = "fr-FR";
  utterance.rate = 0.8;

  speechSynthesis.speak(utterance);
});

navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    audioChunks = [];
    analyzePronunciation(audioBlob);
  };
});

let recognition;
let isRecognizing = false;

document.getElementById("recordBtn").addEventListener("click", () => {
  const recordBtn = document.getElementById("recordBtn");
  const playBtn = document.getElementById("playBtn");
  const feedback = document.getElementById("feedback");
  const targetWord =
    words[currentCategory][currentWordIndex].french.toLowerCase();

  if (isRecognizing) {
    feedback.textContent = "⏳ Veuillez patienter...";
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  isRecognizing = true;
  recordBtn.classList.add("recording");
  recordBtn.disabled = true; 
  playBtn.disabled = true; // 
  feedback.textContent = "🎤 Écoute...";

  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript.toLowerCase();
    const targetWord =
      words[currentCategory][currentWordIndex].french.toLowerCase();
    const accuracy = calculateAccuracy(targetWord, spokenText);
    const highlighted = highlightDifferences(targetWord, spokenText);

    feedback.innerHTML = `
      Vous avez dit : <strong>${spokenText}</strong><br>
      Comparé à : <span class="highlight-target">${highlighted}</span><br>
      Précision : ${accuracy}%
    `;

    feedback.className = "feedback";
    if (accuracy >= 75) feedback.classList.add("good");
    else if (accuracy >= 50) feedback.classList.add("medium");
    else feedback.classList.add("poor");

    // Handle point logic
    if (accuracy === 100) {
      const user = JSON.parse(localStorage.getItem("user"));
      const wordKey = targetWord;

      if (user && user.uid) {
        const wordScoreRef = firebase
          .database()
          .ref(`users/${user.uid}/wordScores/${wordKey}`);

        wordScoreRef.once("value", (snapshot) => {
          const currentWordScore = snapshot.val() || 0;
          const newScore = currentWordScore + 1;

          if (currentWordScore < 3) {
            wordScoreRef.set(newScore);
            const userScoreRef = firebase
              .database()
              .ref(`users/${user.uid}/score`);
            userScoreRef.transaction((current) => (current || 0) + 1);
          }

          if (newScore === 3) {
            document.getElementById(
              "frenchWord"
            ).innerHTML = `${targetWord} <span title="Mastered" style="color:#007bff;">🏆</span>`;

            if (typeof confetti === "function") {
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
              });
            }
          }
        });
      }
    }

    isRecognizing = false;
    recordBtn.classList.remove("recording");
    recordBtn.disabled = false;
    playBtn.disabled = false; 
  };

  recognition.onerror = (err) => {
    console.error("Speech recognition error:", err.error);
    feedback.textContent = "⚠️ Erreur lors de la reconnaissance vocale.";
    isRecognizing = false;
    recordBtn.classList.remove("recording");
    recordBtn.disabled = false;
    playBtn.disabled = false;
  };

  recognition.onend = () => {
    isRecognizing = false;
    recordBtn.classList.remove("recording");
    recordBtn.disabled = false;
    playBtn.disabled = false;
  };

  recognition.start();
});

const numberMap = {
  0: "zéro",
  1: "un",
  2: "deux",
  3: "trois",
  4: "quatre",
  5: "cinq",
  6: "six",
  7: "sept",
  8: "huit",
  9: "neuf",
  10: "dix",
  11: "onze",
  12: "douze",
  13: "treize",
  14: "quatorze",
  15: "quinze",
  16: "seize",
  17: "dix-sept",
  18: "dix-huit",
  19: "dix-neuf",
  20: "vingt",
};

// Enhanced pronunciation rules
function applyCategoryPronunciationRules(text, category) {
  text = text.replace(/\b\d+\b/g, (match) => numberMap[match] || match);

  text = text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[’'‘"`.,!?;:()«»[\]{}]/g, "") // Remove punctuation
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ç/g, "c")
    .replace(/[éèêë]/g, "e")
    .replace(/[àâä]/g, "a")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/-/g, "")
    .replace(/\s+/g, " "); // Normalize spacing

  // Normalize plural pronoun verb forms (ils parlent -> il parle)
  text = text
    .replace(/\bils\s+(\w+ent)\b/g, "il $1") // ils parlent -> il parlent
    .replace(/\belles\s+(\w+ent)\b/g, "elle $1"); // elles chantent -> elle chantent
  if (category === "silentLetters") {
    return text
      .replace(/\bils\b/g, "il") // ils → il
      .replace(/\belles\b/g, "elle") // elles → elle
      .replace(/\b\w+ent\b/g, (match) => match.slice(0, -2)) // parlent → parl
      .replace(/([^aeiou])s$/g, "$1") // Final -s
      .replace(/t$/g, "") // petit
      .replace(/d$/g, "") // grand
      .replace(/x$/g, "") // choix
      .replace(/p$/g, "") // loup
      .replace(/z$/g, "") // nez
      .replace(/es$/g, "e") // parles
      .replace(/rs$/g, "r") // corps
      .replace(/h/g, "") // hôpital
      .replace(/eau/g, "o") // eau -> o
      .replace(/oi/g, "wa"); // roi -> rwa
  }

  if (category === "nasalSounds") {
    return (
      text
        .replace(/am(?=[bp])/g, "ɑ̃")
        .replace(/an/g, "ɑ̃")
        .replace(/em(?=[bp])/g, "ɑ̃")
        .replace(/en/g, "ɑ̃")
        .replace(/om/g, "ɔ̃")
        .replace(/on/g, "ɔ̃")
        .replace(/im/g, "ɛ̃")
        .replace(/in/g, "ɛ̃")
        .replace(/yn/g, "ɛ̃")
        .replace(/um/g, "œ̃")
        .replace(/un/g, "œ̃")
        // Prevent denasalization
        .replace(/ɑ̃/g, "AN")
        .replace(/ɔ̃/g, "ON")
        .replace(/ɛ̃/g, "IN")
        .replace(/œ̃/g, "UN")
    );
  }

  if (category === "liaisons") {
    return text
      .replace(/(ils|elles)\s+([aeéèêh])/g, "$1z$2")
      .replace(/(d)\s([aeéèêh])/g, "$1t$2")
      .replace(/(s|x|z)\s([aeéèêh])/g, "$1z$2")
      .replace(/et\s([aeéèêh])/g, "e$1") // et un -> eun
      .replace(/vous avez/g, "vuzave")
      .replace(/nous avons/g, "nuzavɔ̃")
      .replace(/ils ont/g, "ilzɔ̃")
      .replace(/des enfants/g, "dezɑ̃fɑ̃");
  }

  return text;
}
function calculateAccuracy(expected, actual) {
  const processedExpected = applyCategoryPronunciationRules(
    expected,
    currentCategory
  ).replace(/ /g, "");

  const processedActual = applyCategoryPronunciationRules(
    actual,
    currentCategory
  ).replace(/ /g, "");

  // Log to debug mismatches
  console.log("EXPECTED:", processedExpected);
  console.log("ACTUAL  :", processedActual);

  if (processedActual === processedExpected) return 100;

  const distance = levenshteinDistance(processedExpected, processedActual);
  const rawScore = Math.round((1 - distance / processedExpected.length) * 100);

  // Apply category-based penalties
  let penalty = 0;

  if (currentCategory === "nasalSounds") {
    const nasalHits = ["AN", "ON", "IN", "UN"].some((nasal) =>
      processedActual.includes(nasal)
    );
    if (!nasalHits) penalty += 30;
  }

  if (currentCategory === "liaisons") {
    if (processedExpected.includes("z") && !processedActual.includes("z")) {
      penalty += 40;
    }
  }

  return Math.max(0, rawScore - penalty);
}

function highlightDifferences(target, spoken) {
  let result = "";
  for (let i = 0; i < target.length; i++) {
    const charT = target[i];
    const charS = spoken[i] || "";
    result +=
      charT === charS
        ? `<span>${charT}</span>`
        : `<span class="highlight">${charT}</span>`;
  }
  return result;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.name) {
    const firstName = user.name.split(" ")[0];
    const msg = document.getElementById("welcomeMsg");
    msg.textContent = `Allez ${firstName} !`;
  }
});

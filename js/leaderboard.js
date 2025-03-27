const firebaseConfig = {
    apiKey: "AIzaSyABQpgRnutwoXbYf6LbVXnDfBgHpmW2ZFs",
    authDomain: "comme-les-francais.firebaseapp.com",
    databaseURL: "https://comme-les-francais-default-rtdb.firebaseio.com",
    projectId: "comme-les-francais",
    storageBucket: "comme-les-francais.appspot.com",
    messagingSenderId: "946947303900",
    appId: "1:946947303900:web:701e52ba9db8cbf75d4719"
  };
  
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  
  function loadLeaderboard() {
    const leaderboardList = document.getElementById("leaderboardList");
  
    firebase.database().ref("users")
      .orderByChild("score")
      .limitToLast(10)
      .once("value", snapshot => {
        const users = [];
        snapshot.forEach(child => {
          users.push(child.val());
        });
  
        users.reverse(); // Descending
  
        leaderboardList.innerHTML = '';
        users.forEach((user, index) => {
          leaderboardList.innerHTML += `
            <li>
              ${index + 1}. ${user.name}
              <span>${user.score} pts</span>
            </li>`;
        });
      });
  }
  
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
  
  window.addEventListener("DOMContentLoaded", loadLeaderboard);
  
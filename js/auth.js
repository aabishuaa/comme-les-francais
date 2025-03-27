// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyABQpgRnutwoXbYf6LbVXnDfBgHpmW2ZFs",
    authDomain: "comme-les-francais.firebaseapp.com",
    databaseURL: "https://comme-les-francais-default-rtdb.firebaseio.com",
    projectId: "comme-les-francais",
    storageBucket: "comme-les-francais.appspot.com",
    messagingSenderId: "946947303900",
    appId: "1:946947303900:web:701e52ba9db8cbf75d4719"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const database = firebase.database();

  database.ref("testWrite").set({
    message: "Hello Firebase"
  })
  .then(() => console.log("✅ Test write succeeded"))
  .catch(err => console.error("🔥 Test write failed:", err));
  
  
  document.getElementById("loginBtn").addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
  
    auth.signInWithPopup(provider)
      .then(result => {
        const user = result.user;
        console.log("✅ Signed in as:", user.displayName, user.uid);
  
        const userPath = `users/${user.uid}`;
  
        database.ref(userPath).set({
          name: user.displayName,
          email: user.email,
          score: 0
        })
        .then(() => {
          console.log("✅ User written to database at:", userPath);
        })
        .catch(err => {
          console.error("🔥 Database write failed:", err.message);
        });
  
        localStorage.setItem("user", JSON.stringify({
          uid: user.uid,
          name: user.displayName
        }));
  
        window.location.href = "index.html";
      })
      .catch(err => {
        console.error("❌ Login failed:", err.message);
        alert("Login failed: " + err.message);
      });
  });
  
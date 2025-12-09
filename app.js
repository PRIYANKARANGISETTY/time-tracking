import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser;
let currentDate = new Date().toISOString().slice(0,10);

const datePicker = document.getElementById("datePicker");
datePicker.value = currentDate;

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
  currentUser = user;
  loadActivities();
});

document.getElementById("signOutBtn").onclick = () => signOut(auth);

datePicker.onchange = () => {
  currentDate = datePicker.value;
  loadActivities();
};

async function loadActivities() {
  const list = document.getElementById("activitiesList");
  list.innerHTML = "Loading...";

  const activitiesRef = collection(db, `users/${currentUser.uid}/days/${currentDate}/activities`);
  const snap = await getDocs(activitiesRef);

  let activities = [];
  snap.forEach(d => activities.push({ id: d.id, ...d.data() }));

  renderActivities(activities);
  renderAnalytics(activities);
}

function renderActivities(activities) {
  const list = document.getElementById("activitiesList");
  list.innerHTML = "";

  let total = 0;
  activities.forEach(a => total += a.minutes);

  document.getElementById("remaining").innerText = `Remaining: ${1440 - total} minutes`;
  document.getElementById("analyseBtn").disabled = total !== 1440;

  activities.forEach(a => {
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
      <strong>${a.title}</strong> (${a.category}) — ${a.minutes} min
      <button data-id="${a.id}">Delete</button>
    `;
    item.querySelector("button").onclick = async () => {
      await deleteDoc(doc(db, `users/${currentUser.uid}/days/${currentDate}/activities/${a.id}`));
      loadActivities();
    };
    list.appendChild(item);
  });
}

document.getElementById("addActivityForm").onsubmit = async (e) => {
  e.preventDefault();

  const title = title.value.trim();
  const category = category.value;
  const minutes = parseInt(minutes.value);

  const activitiesRef = collection(db, `users/${currentUser.uid}/days/${currentDate}/activities`);
  await addDoc(activitiesRef, { title, category, minutes });

  e.target.reset();
  loadActivities();
};

function renderAnalytics(activities) {
  if (activities.length === 0) {
    document.getElementById("noData").style.display = "block";
    document.getElementById("charts").style.display = "none";
    return;
  }

  document.getElementById("noData").style.display = "none";
  document.getElementById("charts").style.display = "block";

  document.getElementById("numActivities").innerText = activities.length;

  const total = activities.reduce((s,a)=>s+a.minutes,0);
  document.getElementById("totalHours").innerText = (total/60).toFixed(2);

  const categoryMap = {};
  activities.forEach(a => categoryMap[a.category] = (categoryMap[a.category] || 0) + a.minutes);

  const labels = Object.keys(categoryMap);
  const data = Object.values(categoryMap);

  new Chart(pieChart, {
    type: 'pie',
    data: { labels, datasets: [{ data }] }
  });

  new Chart(barChart, {
    type: 'bar',
    data: {
      labels: activities.map(a=>a.title),
      datasets: [{ label: "Minutes", data: activities.map(a=>a.minutes) }]
    }
  });
}

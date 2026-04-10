const fights = [
  {
    duelo: "R. Nogueira vs M. Silva",
    mercado: "Vencedor da luta",
    odd: "1.82",
    pick: "Nogueira"
  },
  {
    duelo: "A. Costa vs J. Pereira",
    mercado: "Mais de 2.5 rounds",
    odd: "2.05",
    pick: "Over 2.5"
  },
  {
    duelo: "B. Santos vs C. Lima",
    mercado: "Metodo da vitoria",
    odd: "3.40",
    pick: "Finalizacao"
  },
  {
    duelo: "K. Araujo vs T. Freitas",
    mercado: "Luta vai ate decisao",
    odd: "1.66",
    pick: "Sim"
  }
];

const themes = [
  { accent: "#ff6a3d", accent2: "#ffd166" },
  { accent: "#26c485", accent2: "#fef08a" },
  { accent: "#2aa8ff", accent2: "#ffb3c7" }
];

let active = 0;
const cardsRoot = document.querySelector("#cards");
const updated = document.querySelector("#updated");

function renderCards() {
  cardsRoot.innerHTML = fights
    .map(
      (f) => `
      <article class="card">
        <h3>${f.duelo}</h3>
        <p>${f.mercado}</p>
        <p>Odd: <strong>${f.odd}</strong></p>
        <p class="pick">Pick: ${f.pick}</p>
      </article>
    `
    )
    .join("");
}

function changeTheme() {
  active = (active + 1) % themes.length;
  const t = themes[active];
  document.documentElement.style.setProperty("--accent", t.accent);
  document.documentElement.style.setProperty("--accent-2", t.accent2);
}

document.querySelector("#themeBtn").addEventListener("click", changeTheme);
updated.textContent = new Date().toLocaleDateString("pt-BR");
renderCards();

const defaultFights = [
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

const FIGHTS_KEY = "apostas_luta_fights";
const BETTORS_KEY = "apostas_luta_bettors";
const BETS_KEY = "apostas_luta_bets";
const PAYMENT_KEY = "apostas_luta_payment";
const DEFAULT_API_BASE = window.location.origin;

let active = 0;
let editIndex = null;
let isSyncingMpStatus = false;
let fights = loadFights();
let bettors = loadItems(BETTORS_KEY, []);
let bets = loadItems(BETS_KEY, []);
let paymentData = loadPaymentData();

const cardsRoot = document.querySelector("#cards");
const updated = document.querySelector("#updated");
const fightForm = document.querySelector("#fightForm");
const adminList = document.querySelector("#adminList");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const paymentForm = document.querySelector("#paymentForm");
const paymentSummary = document.querySelector("#paymentSummary");
const financialSummary = document.querySelector("#financialSummary");

const sitePanel = document.querySelector("#sitePanel");
const adminPanel = document.querySelector("#adminPanel");
const bettorsPanel = document.querySelector("#bettorsPanel");
const siteTabBtn = document.querySelector("#siteTabBtn");
const bettorsPanelTabBtn = document.querySelector("#bettorsPanelTabBtn");
const adminPanelTabBtn = document.querySelector("#adminPanelTabBtn");

const bettorForm = document.querySelector("#bettorForm");
const bettorsList = document.querySelector("#bettorsList");
const betForm = document.querySelector("#betForm");
const betsList = document.querySelector("#betsList");
const paymentBox = document.querySelector("#paymentBox");

function loadFights() {
  try {
    const data = localStorage.getItem(FIGHTS_KEY);
    if (!data) return [...defaultFights];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...defaultFights];
    return parsed;
  } catch {
    return [...defaultFights];
  }
}

function loadItems(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [...fallback];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [...fallback];
    return parsed;
  } catch {
    return [...fallback];
  }
}

function loadPaymentData() {
  try {
    const data = localStorage.getItem(PAYMENT_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveFights() {
  localStorage.setItem(FIGHTS_KEY, JSON.stringify(fights));
}

function saveBettors() {
  localStorage.setItem(BETTORS_KEY, JSON.stringify(bettors));
}

function saveBets() {
  localStorage.setItem(BETS_KEY, JSON.stringify(bets));
}

function savePaymentData() {
  if (!paymentData) return;
  localStorage.setItem(PAYMENT_KEY, JSON.stringify(paymentData));
}

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

function setActiveTab(mode) {
  const isAdmin = mode === "admin";
  const isBettors = mode === "bettors";

  adminPanel.classList.toggle("hidden", !isAdmin);
  adminPanel.setAttribute("aria-hidden", String(!isAdmin));
  bettorsPanel.classList.toggle("hidden", !isBettors);
  bettorsPanel.setAttribute("aria-hidden", String(!isBettors));
  sitePanel.classList.toggle("hidden", isAdmin || isBettors);

  siteTabBtn.classList.toggle("is-active", !isAdmin && !isBettors);
  bettorsPanelTabBtn.classList.toggle("is-active", isBettors);
  adminPanelTabBtn.classList.toggle("is-active", isAdmin);
}

function renderAdminList() {
  if (fights.length === 0) {
    adminList.innerHTML = "<p>Nenhum confronto cadastrado.</p>";
    return;
  }

  adminList.innerHTML = fights
    .map(
      (f, idx) => `
      <article class="admin-item">
        <div>
          <p><strong>${f.duelo}</strong></p>
          <p>${f.mercado} | Odd: ${f.odd} | Pick: ${f.pick}</p>
        </div>
        <div class="row-actions">
          <button class="small-btn" type="button" data-edit="${idx}">Editar</button>
          <button class="small-btn" type="button" data-remove="${idx}">Excluir</button>
        </div>
      </article>
    `
    )
    .join("");
}

function resetForm() {
  fightForm.reset();
  editIndex = null;
  cancelEditBtn.classList.add("hidden");
}

function fillForm(item) {
  fightForm.duelo.value = item.duelo;
  fightForm.mercado.value = item.mercado;
  fightForm.odd.value = item.odd;
  fightForm.pick.value = item.pick;
  cancelEditBtn.classList.remove("hidden");
}

function hasPaymentConfig() {
  return Boolean(
    paymentData &&
      paymentData.receiverName &&
      paymentData.bankName &&
      paymentData.agency &&
      paymentData.account &&
      paymentData.pixKey
  );
}

function getApiBaseUrl() {
  const configured = paymentData?.mercadoPagoApiUrl?.trim();
  return configured || DEFAULT_API_BASE;
}

function hasMercadoPagoApiConfig() {
  const value = getApiBaseUrl();
  return Boolean(value);
}

async function createMercadoPagoCheckout({ betId, duelo, amount, bettor }) {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/payments/mercadopago/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      betId,
      title: `Aposta - ${duelo}`,
      amount,
      bettor
    })
  });

  if (!response.ok) {
    throw new Error("Falha ao criar checkout Mercado Pago");
  }

  return response.json();
}

async function syncMercadoPagoBetStatuses() {
  if (isSyncingMpStatus) return;

  const mercadoPagoBets = bets.filter((bet) => bet.paymentMethod === "MercadoPago");
  if (mercadoPagoBets.length === 0) return;

  isSyncingMpStatus = true;
  const apiBase = getApiBaseUrl();
  let changed = false;

  try {
    for (const bet of mercadoPagoBets) {
      try {
        const response = await fetch(`${apiBase}/api/payments/status/${bet.id}`);
        if (!response.ok) continue;

        const payload = await response.json();
        const nextStatus = payload.status || "pendente";

        if (bet.paymentStatus !== nextStatus) {
          bet.paymentStatus = nextStatus;
          changed = true;
        }

        if (payload.paymentId && bet.paymentId !== payload.paymentId) {
          bet.paymentId = payload.paymentId;
          changed = true;
        }

        if (payload.updatedAt && bet.paymentUpdatedAt !== payload.updatedAt) {
          bet.paymentUpdatedAt = payload.updatedAt;
          changed = true;
        }
      } catch {
        continue;
      }
    }

    if (changed) {
      saveBets();
      renderBetsList();
      renderFinancialSummary();
    }
  } finally {
    isSyncingMpStatus = false;
  }
}

function hydratePaymentForm() {
  if (!paymentData) return;
  paymentForm.receiverName.value = paymentData.receiverName || "";
  paymentForm.bankName.value = paymentData.bankName || "";
  paymentForm.agency.value = paymentData.agency || "";
  paymentForm.account.value = paymentData.account || "";
  paymentForm.pixKey.value = paymentData.pixKey || "";
  paymentForm.mercadoPagoLink.value = paymentData.mercadoPagoLink || "";
  paymentForm.mercadoPagoApiUrl.value = paymentData.mercadoPagoApiUrl || "";
}

function renderPaymentSummary() {
  if (!hasPaymentConfig()) {
    paymentSummary.innerHTML = "<p>Dados de pagamento ainda nao cadastrados.</p>";
    paymentBox.innerHTML = "<p>Pagamento indisponivel. Aguarde o admin cadastrar os dados bancarios.</p>";
    return;
  }

  paymentSummary.innerHTML = `
    <article class="admin-item">
      <div>
        <p><strong>Recebedor:</strong> ${paymentData.receiverName}</p>
        <p><strong>Banco:</strong> ${paymentData.bankName}</p>
        <p><strong>Agencia/Conta:</strong> ${paymentData.agency} / ${paymentData.account}</p>
        <p><strong>PIX:</strong> ${paymentData.pixKey}</p>
        <p><strong>Mercado Pago:</strong> ${paymentData.mercadoPagoLink ? "Configurado" : "Nao configurado"}</p>
        <p><strong>API Mercado Pago:</strong> ${hasMercadoPagoApiConfig() ? getApiBaseUrl() : "Nao configurada"}</p>
      </div>
    </article>
  `;

  const mercadoPagoCta = paymentData.mercadoPagoLink
    ? `<a class="pay-link" href="${paymentData.mercadoPagoLink}" target="_blank" rel="noopener noreferrer">Pagar com Mercado Pago</a>`
    : "<p>Mercado Pago nao configurado pelo admin.</p>";

  paymentBox.innerHTML = `
    <p><strong>Dados para pagamento da aposta</strong></p>
    <p>Recebedor: ${paymentData.receiverName}</p>
    <p>Banco: ${paymentData.bankName}</p>
    <p>Agencia/Conta: ${paymentData.agency} / ${paymentData.account}</p>
    <p>Chave PIX: ${paymentData.pixKey}</p>
    ${mercadoPagoCta}
  `;
}

function renderBettorsList() {
  if (bettors.length === 0) {
    bettorsList.innerHTML = "<p>Nenhum apostador cadastrado.</p>";
    return;
  }

  bettorsList.innerHTML = bettors
    .map(
      (bettor) => `
      <article class="admin-item">
        <div>
          <p><strong>${bettor.name}</strong></p>
          <p>${bettor.email}${bettor.phone ? ` | ${bettor.phone}` : ""}</p>
        </div>
        <div class="row-actions">
          <button class="small-btn" type="button" data-remove-bettor="${bettor.id}">Excluir</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderBettorOptions() {
  if (bettors.length === 0) {
    betForm.betBettor.innerHTML = "<option value=''>Cadastre um apostador primeiro</option>";
    return;
  }

  betForm.betBettor.innerHTML = bettors
    .map((bettor) => `<option value="${bettor.id}">${bettor.name}</option>`)
    .join("");
}

function renderFightOptions() {
  if (fights.length === 0) {
    betForm.betFight.innerHTML = "<option value=''>Cadastre um confronto no admin</option>";
    return;
  }

  betForm.betFight.innerHTML = fights
    .map((fight, index) => `<option value="${index}">${fight.duelo} | Odd ${fight.odd}</option>`)
    .join("");
}

function renderBetsList() {
  if (bets.length === 0) {
    betsList.innerHTML = "<p>Nenhuma aposta registrada.</p>";
    return;
  }

  betsList.innerHTML = bets
    .map(
      (bet) => `
      <article class="admin-item">
        <div>
          <p><strong>${bet.bettorName}</strong> apostou em ${bet.duelo}</p>
          <p>Pick: ${bet.pick} | Valor: R$ ${Number(bet.amount).toFixed(2)} | Odd: ${bet.odd}</p>
          <p>Pagamento: ${bet.paymentMethod} | Status: ${bet.paymentStatus || "pendente"}</p>
          ${bet.paymentId ? `<p>Transacao: ${bet.paymentId}</p>` : ""}
          ${bet.paymentUpdatedAt ? `<p>Atualizado em: ${new Date(bet.paymentUpdatedAt).toLocaleString("pt-BR")}</p>` : ""}
          ${bet.checkoutUrl ? `<p><a class="pay-link" href="${bet.checkoutUrl}" target="_blank" rel="noopener noreferrer">Abrir checkout</a></p>` : ""}
        </div>
        <div class="row-actions">
          <button class="small-btn" type="button" data-remove-bet="${bet.id}">Excluir</button>
        </div>
      </article>
    `
    )
    .join("");
}

function toMoney(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

function renderFinancialSummary() {
  if (bets.length === 0) {
    financialSummary.innerHTML = "<p>Nenhuma aposta registrada ainda.</p>";
    return;
  }

  const total = bets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0);
  const approved = bets
    .filter((bet) => bet.paymentStatus === "approved")
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);
  const pending = bets
    .filter((bet) => bet.paymentStatus !== "approved")
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);
  const approvedCount = bets.filter((bet) => bet.paymentStatus === "approved").length;

  financialSummary.innerHTML = `
    <article class="summary-card">
      <p>Total apostado</p>
      <strong>${toMoney(total)}</strong>
    </article>
    <article class="summary-card">
      <p>Total aprovado</p>
      <strong>${toMoney(approved)}</strong>
    </article>
    <article class="summary-card">
      <p>Total pendente</p>
      <strong>${toMoney(pending)}</strong>
    </article>
    <article class="summary-card">
      <p>Apostas aprovadas</p>
      <strong>${approvedCount}</strong>
    </article>
  `;
}

function syncBetFormState() {
  const hasBettors = bettors.length > 0;
  const hasFights = fights.length > 0;
  const canBet = hasBettors && hasFights && hasPaymentConfig();

  betForm.betBettor.disabled = !hasBettors;
  betForm.betFight.disabled = !hasFights;
  betForm.betPaymentMethod.disabled = !canBet;
  betForm.betPick.disabled = !canBet;
  betForm.betAmount.disabled = !canBet;
  betForm.querySelector("button[type='submit']").disabled = !canBet;
}

function renderAll() {
  renderCards();
  renderAdminList();
  renderBettorsList();
  renderBettorOptions();
  renderFightOptions();
  renderBetsList();
  renderPaymentSummary();
  renderFinancialSummary();
  syncBetFormState();
  syncMercadoPagoBetStatuses();
}

document.querySelector("#themeBtn").addEventListener("click", changeTheme);
document.querySelector("#adminTabBtn").addEventListener("click", () => setActiveTab("admin"));
document.querySelector("#bettorsTabBtn").addEventListener("click", () => setActiveTab("bettors"));

siteTabBtn.addEventListener("click", () => setActiveTab("site"));
bettorsPanelTabBtn.addEventListener("click", () => setActiveTab("bettors"));
adminPanelTabBtn.addEventListener("click", () => setActiveTab("admin"));

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nextData = {
    receiverName: paymentForm.receiverName.value.trim(),
    bankName: paymentForm.bankName.value.trim(),
    agency: paymentForm.agency.value.trim(),
    account: paymentForm.account.value.trim(),
    pixKey: paymentForm.pixKey.value.trim(),
    mercadoPagoLink: paymentForm.mercadoPagoLink.value.trim(),
    mercadoPagoApiUrl: paymentForm.mercadoPagoApiUrl.value.trim()
  };

  const requiredFields = [
    nextData.receiverName,
    nextData.bankName,
    nextData.agency,
    nextData.account,
    nextData.pixKey
  ];

  if (requiredFields.some((value) => !value)) return;

  paymentData = nextData;
  savePaymentData();
  renderAll();
});

fightForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const item = {
    duelo: fightForm.duelo.value.trim(),
    mercado: fightForm.mercado.value.trim(),
    odd: fightForm.odd.value.trim(),
    pick: fightForm.pick.value.trim()
  };

  if (!item.duelo || !item.mercado || !item.odd || !item.pick) return;

  if (editIndex === null) {
    fights.unshift(item);
  } else {
    fights[editIndex] = item;
  }

  saveFights();
  resetForm();
  renderAll();
});

cancelEditBtn.addEventListener("click", resetForm);

adminList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.dataset.edit !== undefined) {
    const index = Number(target.dataset.edit);
    editIndex = index;
    fillForm(fights[index]);
    return;
  }

  if (target.dataset.remove !== undefined) {
    const index = Number(target.dataset.remove);
    fights.splice(index, 1);
    saveFights();
    if (editIndex === index) resetForm();
    if (editIndex !== null && editIndex > index) editIndex -= 1;
    renderAll();
  }
});

bettorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = bettorForm.bettorName.value.trim();
  const email = bettorForm.bettorEmail.value.trim().toLowerCase();
  const phone = bettorForm.bettorPhone.value.trim();

  if (!name || !email) return;

  const alreadyExists = bettors.some((bettor) => bettor.email === email);
  if (alreadyExists) {
    alert("Este e-mail ja esta cadastrado.");
    return;
  }

  bettors.unshift({
    id: `b-${Date.now()}`,
    name,
    email,
    phone
  });

  saveBettors();
  bettorForm.reset();
  renderAll();
});

bettorsList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.dataset.removeBettor !== undefined) {
    const bettorId = target.dataset.removeBettor;
    bettors = bettors.filter((bettor) => bettor.id !== bettorId);
    bets = bets.filter((bet) => bet.bettorId !== bettorId);
    saveBettors();
    saveBets();
    renderAll();
  }
});

betForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const bettorId = betForm.betBettor.value;
  const fightIndex = Number(betForm.betFight.value);
  const pick = betForm.betPick.value.trim();
  const amount = Number(betForm.betAmount.value);
  const paymentMethod = betForm.betPaymentMethod.value;

  const bettor = bettors.find((item) => item.id === bettorId);
  const fight = fights[fightIndex];
  if (!bettor || !fight || !pick || Number.isNaN(amount) || amount <= 0 || !hasPaymentConfig()) return;

  const betId = `ap-${Date.now()}`;
  let checkoutUrl = "";
  let paymentStatus = "pendente";

  if (paymentMethod === "MercadoPago") {
    try {
      const result = await createMercadoPagoCheckout({
        betId,
        duelo: fight.duelo,
        amount,
        bettor: {
          name: bettor.name,
          email: bettor.email
        }
      });

      checkoutUrl = result.initPoint || "";
      if (!checkoutUrl && result.sandboxInitPoint) {
        checkoutUrl = result.sandboxInitPoint;
      }
      paymentStatus = "checkout_criado";

      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      alert("Nao foi possivel criar o checkout no Mercado Pago. Verifique a API configurada.");
      return;
    }
  }

  bets.unshift({
    id: betId,
    bettorId,
    bettorName: bettor.name,
    duelo: fight.duelo,
    odd: fight.odd,
    paymentMethod,
    paymentStatus,
    checkoutUrl,
    paymentId: null,
    paymentUpdatedAt: null,
    pick,
    amount
  });

  saveBets();
  betForm.betPick.value = "";
  betForm.betAmount.value = "";
  renderAll();
});

betsList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.dataset.removeBet !== undefined) {
    const betId = target.dataset.removeBet;
    bets = bets.filter((bet) => bet.id !== betId);
    saveBets();
    renderAll();
  }
});

updated.textContent = new Date().toLocaleDateString("pt-BR");
hydratePaymentForm();
setActiveTab("site");
renderAll();

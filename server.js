import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const app = express();
const port = Number(process.env.PORT || 3000);
const configuredBaseUrl = process.env.BASE_URL || "";
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

const paymentStorePath = path.join(process.cwd(), "data", "payment-status.json");
const paymentStatusByBet = new Map();

let mpClient = null;
if (mpAccessToken) {
  mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
}

app.use(cors());
app.use(express.json());
app.set("trust proxy", true);

function resolveBaseUrl(req) {
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}`;
}

async function loadPaymentStore() {
  try {
    const raw = await fs.readFile(paymentStorePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    Object.entries(parsed).forEach(([betId, status]) => {
      paymentStatusByBet.set(betId, status);
    });
  } catch {
    await fs.mkdir(path.dirname(paymentStorePath), { recursive: true });
    await fs.writeFile(paymentStorePath, "{}", "utf-8");
  }
}

async function savePaymentStore() {
  const plain = Object.fromEntries(paymentStatusByBet.entries());
  await fs.mkdir(path.dirname(paymentStorePath), { recursive: true });
  await fs.writeFile(paymentStorePath, JSON.stringify(plain, null, 2), "utf-8");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mercadoPagoConfigured: Boolean(mpClient) });
});

app.post("/api/payments/mercadopago/checkout", async (req, res) => {
  try {
    if (!mpClient) {
      return res.status(500).json({
        message: "Mercado Pago nao configurado no servidor. Defina MP_ACCESS_TOKEN."
      });
    }

    const { betId, title, amount, bettor } = req.body || {};
    const normalizedAmount = Number(amount);

    if (!betId || !title || Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ message: "Dados de checkout invalidos." });
    }

    const runtimeBaseUrl = resolveBaseUrl(req);

    const preference = new Preference(mpClient);
    const response = await preference.create({
      body: {
        external_reference: String(betId),
        notification_url: `${runtimeBaseUrl}/api/payments/mercadopago/webhook`,
        statement_descriptor: "APOSTAS LUTA",
        payer: {
          email: bettor?.email,
          name: bettor?.name
        },
        items: [
          {
            id: String(betId),
            title: String(title),
            description: "Aposta esportiva",
            quantity: 1,
            currency_id: "BRL",
            unit_price: normalizedAmount
          }
        ],
        back_urls: {
          success: `${runtimeBaseUrl}/?pagamento=sucesso`,
          pending: `${runtimeBaseUrl}/?pagamento=pendente`,
          failure: `${runtimeBaseUrl}/?pagamento=falha`
        },
        auto_return: "approved"
      }
    });

    paymentStatusByBet.set(String(betId), {
      status: "checkout_criado",
      paymentId: null,
      updatedAt: new Date().toISOString()
    });
    await savePaymentStore();

    return res.json({
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao criar checkout do Mercado Pago.",
      detail: error?.message || "erro_desconhecido"
    });
  }
});

app.post("/api/payments/mercadopago/webhook", async (req, res) => {
  try {
    const eventType = req.body?.type || req.query?.type;
    const paymentId = req.body?.data?.id || req.query?.data_id || req.query?.id;

    if (eventType !== "payment" || !paymentId) {
      return res.status(200).send("ok");
    }

    if (!mpClient) {
      return res.status(200).send("ok");
    }

    const paymentApi = new Payment(mpClient);
    const payment = await paymentApi.get({ id: String(paymentId) });

    const betId = payment.external_reference;
    if (betId) {
      paymentStatusByBet.set(String(betId), {
        status: payment.status || "unknown",
        paymentId: String(paymentId),
        updatedAt: new Date().toISOString()
      });
      await savePaymentStore();
    }

    return res.status(200).send("ok");
  } catch {
    return res.status(200).send("ok");
  }
});

app.get("/api/payments/status/:betId", (req, res) => {
  const { betId } = req.params;
  const paymentStatus = paymentStatusByBet.get(String(betId));

  if (!paymentStatus) {
    return res.status(404).json({ status: "nao_encontrado" });
  }

  return res.json(paymentStatus);
});

app.use(express.static(process.cwd()));

app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

loadPaymentStore().then(() => {
  app.listen(port, () => {
    console.log(`Servidor online na porta ${port}`);
  });
});

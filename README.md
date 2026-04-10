# Apostas Luta Site

Site com painel de admin, cadastro de apostadores e pagamentos via Mercado Pago.

## 1) Instalar dependencias

```bash
cd /Users/jpma/apostas-luta-site
npm install
```

## 2) Configurar variaveis

Crie um arquivo `.env` com base no `.env.example`:

```bash
PORT=3000
BASE_URL=http://localhost:3000
MP_ACCESS_TOKEN=SEU_ACCESS_TOKEN_MERCADOPAGO
```

## 3) Rodar localmente

```bash
npm run dev
```

Abra `http://localhost:3000`.

## 4) Configurar no painel Admin

No formulario de pagamento, informe:

- dados bancarios (recebedor, banco, agencia, conta, PIX)
- URL da API Mercado Pago: use `http://localhost:3000` no ambiente local

Depois disso, ao registrar uma aposta com metodo `MercadoPago`, o sistema cria checkout dinamico com o valor da aposta.

## 5) Webhook Mercado Pago

No app do Mercado Pago, configure a URL de notificacao:

`https://SEU_DOMINIO/api/payments/mercadopago/webhook`

Para testes locais, use tunel (ex.: ngrok) e configure `BASE_URL` para a URL publica do tunel.

## 6) Deploy do backend no Render

Este repositorio ja possui `render.yaml` com configuracao inicial.

1. Acesse o Render e escolha New + Blueprint.
2. Conecte o repositorio `Jpamaral02/apostas-luta-site`.
3. No servico `apostas-luta-backend`, configure a env var secreta:
	- `MP_ACCESS_TOKEN`
4. Finalize o deploy.

Depois do deploy, copie a URL publica do backend e, no painel Admin do site, preencha o campo:

- URL da API Mercado Pago: `https://SEU_BACKEND_RENDER.onrender.com`

Tambem configure no painel do Mercado Pago o webhook:

- `https://SEU_BACKEND_RENDER.onrender.com/api/payments/mercadopago/webhook`

## Endpoints disponiveis

- `GET /api/health`
- `POST /api/payments/mercadopago/checkout`
- `POST /api/payments/mercadopago/webhook`
- `GET /api/payments/status/:betId`

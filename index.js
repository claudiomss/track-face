const express = require("express")
const { createClient } = require("@supabase/supabase-js")
const app = express()
const https = require("https")
const fs = require("fs")
const axios = require("axios")

const supabaseUrl = "https://jhaezscwymystvfwagaq.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoYWV6c2N3eW15c3R2ZndhZ2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1MzcyNjgsImV4cCI6MjAzODExMzI2OH0.ZxUK3J9W6Y_mpGSwthmj6L14PnwrXDrFCdIM1PrmIVA"
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const cors = require("cors")
const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/servertt.online/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/servertt.online/fullchain.pem"),
}

// Middleware para lidar com JSON no corpo da requisição
app.use(express.json())
app.use(cors())

// Ou configure de forma mais específica
app.use((req, res, next) => {
  //Qual site tem permissão de realizar a conexão, no exemplo abaixo está o "*" indicando que qualquer site pode fazer a conexão
  res.header("Access-Control-Allow-Origin", "*")
  //Quais são os métodos que a conexão pode realizar na API
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE")
  app.use(cors())
  next()
})

app.get("/", cors(), async (req, res) => {
  res.status(200).send("Rodando")
})

function getPixel(pixelName) {
  const accessToken_CLD =
    "EAAL1DetdEEUBO6FW7FFAa7uESZCaC1QBdok77gT5BGWBYwORbZBD44MGatJaG8YMRURF7ZCA6Ehj9Eh0FhLDgoudB0ozp4u5iAuk5VmotabYF4JHB1Lkwsf5yQV5huWWXPqL0ZCKkIKYbjpASXxRbNMiIP9fsUNuWUZBKGEZAUVJufNuZBpDqorLp7lZBlxJOEtjPgZDZD"
  const pixelId_CLD = "468525639505628"

  const accessToken_VN =
    "EAAGyx4TrTyIBOwSUOMlAK2sN1fVwT2E0SCItWqqGKmn7MFNfH9mtJcOz7JIO8KDifTULAAbtZCq8S8357y7xZBuoXFG9vb5AYII1ZAV6w4ZBVETZAqaruoAsnnVz6ZAUuyDZBAjeVVPAVKZCOi7yqGZClrlzdtx95MQdRuad3CVbbi6UnPjEFesBHWoMpvZCV1wQZDZD"
  const pixelId_VN = "8194482793967044"

  if (pixelName == "Claudio") {
    return {
      token: accessToken_CLD,
      pixelID: pixelId_CLD,
    }
  }

  if (pixelName == "Vinni") {
    return {
      token: accessToken_VN,
      pixelID: pixelId_VN,
    }
  }
}

app.post("/setDB", cors(), async (req, res) => {
  const dataReq = req.body
  const {
    utm_source,
    utm_campaign,
    utm_medium,
    utm_content,
    cmc_adid,
    fbclid,
    _fbc,
    _fbp,
    url,
    page,
    name,
  } = dataReq

  await supabase.from("InitiateCheckout").insert({
    utm_source,
    utm_campaign,
    utm_medium,
    utm_content,
    cmc_adid,
    fbclid,
    _fbc,
    _fbp,
    url,
    page,
    name,
  })
})

async function sendEventToFacebook(
  eventName,
  urlSite,
  userData,
  customData,
  pixelId,
  accessToken
) {
  const url = `https://graph.facebook.com/v17.0/${pixelId}/events`

  const payload = {
    data: [
      {
        event_name: eventName, // Nome do evento, ex: PageView ou AddToCart
        event_time: Math.floor(Date.now() / 1000), // Tempo do evento em timestamp Unix
        action_source: "website", // Origem da ação (website, app, etc.)
        event_source_url: urlSite,
        user_data: userData, // Dados do usuário, como email ou IP
        custom_data: customData, // Dados personalizados, como valor de compra
      },
    ],
    access_token: accessToken,
  }

  try {
    const response = await axios.post(url, payload)
    console.log(`Evento ${eventName} enviado com sucesso:`, response.data)
  } catch (error) {
    console.error(
      `Erro ao enviar o evento ${eventName}:`,
      error.response ? error.response.data : error.message
    )
  }
}

// Rota para enviar o evento PageView
app.post("/send-pageview", async (req, res) => {
  const urlSite = req.body.url

  const userData = {
    client_ip_address:
      req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    client_user_agent: req.headers["user-agent"],
    fbc: req.body._fbc,
    fbp: req.body._fbp,
    fbclid: req.body.fbclid,
  }

  customData = {
    utm_source: req.body.utm_source,
    utm_campaign: req.body.utm_campaign,
    utm_medium: req.body.utm_medium,
    utm_content: req.body.utm_content,
    cmc_adid: req.body.cmc_adid,
  }

  // await sendEventToFacebook("PageView", userData, {})
  const pixelData = getPixel(req.body.name)
  const pixelId = pixelData.pixelID
  const accessToken = pixelData.token

  await sendEventToFacebook(
    "PageView",
    urlSite,
    userData,
    customData,
    pixelId,
    accessToken
  )
  res.send("Evento PageView enviado!")
})

// Rota para enviar o evento AddToCart
app.post("/send-pre-checkout", async (req, res) => {
  const urlSite = req.body.url

  const userData = {
    client_ip_address:
      req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    client_user_agent: req.headers["user-agent"],
    fbc: req.body._fbc,
    fbp: req.body._fbp,
    fbclid: req.body.fbclid,
  }

  customData = {
    currency: "USD",
    value: 160.0,
    content_ids: ["ED01"],
    contents: [{ id: "ED01", quantity: 1 }],
    content_type: "product",
    utm_source: req.body.utm_source,
    utm_campaign: req.body.utm_campaign,
    utm_medium: req.body.utm_medium,
    utm_content: req.body.utm_content,
    cmc_adid: req.body.cmc_adid,
  }

  const pixelData = getPixel(req.body.name)
  const pixelId = pixelData.pixelID
  const accessToken = pixelData.token

  await sendEventToFacebook(
    "pre-checkout",
    urlSite,
    userData,
    customData,
    pixelId,
    accessToken
  )
  res.send("Evento Pre-checkout enviado!")
})

app.post("/send-initiate-checkout", async (req, res) => {
  const urlSite = req.body.url

  const userData = {
    client_ip_address:
      req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    client_user_agent: req.headers["user-agent"],
    fbc: req.body._fbc,
    fbp: req.body._fbp,
    fbclid: req.body.fbclid,
  }

  customData = {
    currency: "USD",
    value: 160.0,
    content_ids: ["ED01"],
    contents: [{ id: "ED01", quantity: 1 }],
    content_type: "product",
    utm_source: req.body.utm_source,
    utm_campaign: req.body.utm_campaign,
    utm_medium: req.body.utm_medium,
    utm_content: req.body.utm_content,
    cmc_adid: req.body.cmc_adid,
  }

  const pixelData = getPixel(req.body.name)
  const pixelId = pixelData.pixelID
  const accessToken = pixelData.token

  await sendEventToFacebook(
    "InitiateCheckout",
    urlSite,
    userData,
    customData,
    pixelId,
    accessToken
  )
  res.send("Evento InitiateCheckout enviado!")
})

https.createServer(options, app).listen(443, () => {
  console.log("Server is running on https://servertt.online")
})

// const PORT = 3000
// app.listen(PORT, () => {
//   console.log(`Servidor rodando em http://localhost:${PORT}`)
// })

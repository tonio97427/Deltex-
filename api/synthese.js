export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const base = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json";
    const q = async (name) => {
      const url = `${base}?$limit=1&$order=report_date_as_yyyy_mm_dd DESC&$where=market_and_exchange_names like '${name}'`;
      const r = await fetch(url);
      const d = await r.json();
      return d[0];
    };

    const [eu, jpy, gold, wti, sp, nq, btc] = await Promise.all([
      q("EURO FX"), q("JAPANESE YEN"), q("GOLD"), q("CRUDE OIL"),
      q("E-MINI S"), q("E-MINI NASDAQ"), q("BITCOIN"),
    ]);

    const getNet = (r) => {
      if (!r) return { bias: "inconnu", pct: "0%", net: "0k" };
      const l = parseInt(r.noncomm_positions_long_all || 0);
      const s = parseInt(r.noncomm_positions_short_all || 0);
      const net = l - s;
      const total = l + s;
      return {
        bias: net > 0 ? "Long" : "Short",
        pct: total > 0 ? ((net / total) * 100).toFixed(1) + "%" : "0%",
        net: (net > 0 ? "+" : "") + (net / 1000).toFixed(0) + "k contrats"
      };
    };

    const date = eu?.report_date_as_yyyy_mm_dd || "semaine en cours";
    const euD = getNet(eu);
    const jpyD = getNet(jpy);
    const goldD = getNet(gold);
    const wtiD = getNet(wti);
    const spD = getNet(sp);
    const nqD = getNet(nq);
    const btcD = getNet(btc);

    const prompt = `Tu es un analyste macro expert, nous sommes en juin 2026.
Voici les positions COT reelles de la CFTC semaine du ${date} :

EUR/USD : ${euD.bias} ${euD.pct} (${euD.net})
JPY/USD : ${jpyD.bias} ${jpyD.pct} (${jpyD.net})
Or : ${goldD.bias} ${goldD.pct} (${goldD.net})
WTI : ${wtiD.bias} ${wtiD.pct} (${wtiD.net})
SP500 : ${spD.bias} ${spD.pct} (${spD.net})
Nasdaq : ${nqD.bias} ${nqD.pct} (${nqD.net})
BTC CME : ${btcD.bias} ${btcD.pct} (${btcD.net})

Genere une synthese en francais avec 3 sections :
**LA GRAVITE MACRO**
**ANALYSE STRUCTURELLE**
**EXECUTION TACTIQUE**

Parle comme un trader institutionnel. Concis et percutant. Pas de disclaimer. Base toi uniquement sur ces donnees COT reelles.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
      },
      body: JSON.stringify({
        model: model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      }),
    });

    const data = await groqRes.json();
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: JSON.stringify(data) });
    }
    res.json({ synthese: data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

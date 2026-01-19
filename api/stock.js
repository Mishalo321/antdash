export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');

    const { symbols } = req.query;
    if (!symbols) return res.status(200).json([]);

    const symbolList = symbols.split(',');

    try {
        const requests = symbolList.map(symbol => 
            fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.trim()}?interval=1d&range=1d`)
            .then(async res => {
                if (!res.ok) return null;
                return res.json();
            })
            .catch(() => null)
        );

        const responses = await Promise.all(requests);

        const results = responses.map((data, index) => {
            const requestedSymbol = symbolList[index];

            if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
                return {
                    symbol: requestedSymbol,
                    name: "조회 실패",
                    price: 0,
                    change: 0,
                    percent: 0,
                    valid: false
                };
            }

            const meta = data.chart.result[0].meta;
            const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
            const prevClose = meta.chartPreviousClose || price;
            const change = price - prevClose;
            const percent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

            return {
                symbol: meta.symbol,
                name: meta.symbol, 
                price: price,
                change: change,
                percent: percent,
                valid: true
            };
        });

        res.status(200).json(results);

    } catch (error) {
        console.error(error);
        res.status(200).json([]);
    }
}

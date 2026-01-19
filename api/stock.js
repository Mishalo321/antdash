export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');

    const { symbols } = req.query;
    if (!symbols) return res.status(200).json([]);

    const STOCK_NAMES = {
        '005930.KS': '삼성전자',
        '000660.KS': 'SK하이닉스',
        '373220.KS': 'LG에너지솔루션',
        '207940.KS': '삼성바이오로직스',
        '005380.KS': '현대차',
        '000270.KS': '기아',
        '068270.KS': '셀트리온',
        '005490.KS': 'POSCO홀딩스',
        '035420.KS': 'NAVER',
        '035720.KS': '카카오',
        '247540.KQ': '에코프로비엠',
        '086520.KQ': '에코프로',
        '028300.KQ': 'HLB',
        '066970.KQ': '엘앤에프',
        '196170.KQ': '알테오젠',
        'TSLA': '테슬라',
        'AAPL': '애플',
        'NVDA': '엔비디아',
        'MSFT': '마이크로소프트',
        'GOOGL': '구글',
        'AMZN': '아마존',
        'SOXL': '반도체 3배(SOXL)',
        'TQQQ': '나스닥 3배(TQQQ)'
    };

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
            const requestedSymbol = symbolList[index].trim();

            if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
                return {
                    symbol: requestedSymbol,
                    name: STOCK_NAMES[requestedSymbol] || "조회 실패",
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
            const finalName = STOCK_NAMES[requestedSymbol] || meta.symbol;

            return {
                symbol: meta.symbol,
                name: finalName,
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

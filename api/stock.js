export default async function handler(req, res) {
    // 1분간 캐싱 (너무 자주 요청하면 차단당함)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    const { symbols } = req.query;

    // 요청한 종목이 없으면 빈 배열 반환
    if (!symbols) {
        return res.status(200).json([]);
    }

    try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
        
        // ⚠️ 핵심 수정: 브라우저인 척 위장하는 헤더(User-Agent) 추가
        const yahooRes = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!yahooRes.ok) {
            throw new Error(`Yahoo API Error: ${yahooRes.status}`);
        }

        const data = await yahooRes.json();
        
        // 데이터가 없거나 구조가 이상할 경우 방어
        if (!data.quoteResponse || !data.quoteResponse.result) {
            console.error("Yahoo response invalid:", JSON.stringify(data));
            return res.status(500).json({ error: '데이터 형식 오류' });
        }

        const results = data.quoteResponse.result.map(item => ({
            symbol: item.symbol,
            // 이름이 없으면 티커(Symbol)로 대체
            name: item.shortName || item.longName || item.symbol, 
            // 장 중에는 regularMarketPrice, 장 마감 후에는 postMarketPrice 사용 시도
            price: item.regularMarketPrice || item.postMarketPrice || 0,
            change: item.regularMarketChange || 0,
            percent: item.regularMarketChangePercent || 0
        }));

        res.status(200).json(results);

    } catch (error) {
        console.error("Stock Fetch Error:", error);
        res.status(500).json({ error: '주가 정보를 가져오는데 실패했습니다.' });
    }
}

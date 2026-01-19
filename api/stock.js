// api/stock.js
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // 1분 캐싱

    // 프론트엔드에서 ?symbols=005930.KS,000660.KS 형태로 요청이 옴
    const { symbols } = req.query;

    if (!symbols) {
        return res.status(400).json({ error: '종목 코드가 필요합니다.' });
    }

    try {
        // 야후 파이낸스에서 여러 종목 정보를 한 번에 가져옴
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
        const yahooRes = await fetch(url);
        const data = await yahooRes.json();
        
        if (!data.quoteResponse || !data.quoteResponse.result) {
            return res.status(500).json({ error: '데이터 형식 오류' });
        }

        const results = data.quoteResponse.result.map(item => ({
            symbol: item.symbol,
            name: item.shortName || item.longName, // 한글 이름이 없으면 영문 이름 사용
            price: item.regularMarketPrice,
            change: item.regularMarketChange,
            percent: item.regularMarketChangePercent
        }));

        res.status(200).json(results);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '주가 정보를 가져오는데 실패했습니다.' });
    }
}
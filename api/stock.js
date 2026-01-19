export default async function handler(req, res) {
    // 1. 캐싱 및 타임아웃 설정
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    const { symbols } = req.query;

    if (!symbols) return res.status(200).json([]);

    try {
        // 2. 야후 파이낸스 API 주소 (v7 -> v6로 변경 시도, query2 사용)
        const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

        // 3. 5초 안에 응답 없으면 강제 종료 (무한 로딩 방지)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const yahooRes = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // 성공하면 타이머 해제

        if (!yahooRes.ok) {
            throw new Error(`Yahoo API Status: ${yahooRes.status}`);
        }

        const data = await yahooRes.json();
        const resultList = data.quoteResponse?.result || [];

        // 4. 데이터 가공
        const results = resultList.map(item => ({
            symbol: item.symbol,
            name: item.shortName || item.longName || item.symbol, 
            price: item.regularMarketPrice || item.postMarketPrice || 0,
            change: item.regularMarketChange || 0,
            percent: item.regularMarketChangePercent || 0
        }));

        res.status(200).json(results);

    } catch (error) {
        console.error("Stock API Error:", error);
        
        // ⚠️ [비상 대책] API가 막히면 테스트용 가짜 데이터라도 반환 (화면 확인용)
        // 실제로는 에러지만, 사용자에게 UI 작동 여부를 보여주기 위함
        const mockData = symbols.split(',').map(s => ({
            symbol: s,
            name: "데이터 로딩 실패 (테스트)",
            price: 0,
            change: 0,
            percent: 0
        }));
        
        // 에러 상황을 알리면서 가짜 데이터 반환
        res.status(200).json(mockData); 
    }
}

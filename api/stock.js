export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate'); 
    const { symbols } = req.query;

    if (!symbols) return res.json([]);

    const symbolList = symbols.split(',');
    const results = [];

    // 🛡️ 네이버 차단 방지용 가짜 신분증 (User-Agent)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 하나씩 처리 (Promise.all로 병렬 처리하면 더 빠름)
    await Promise.all(symbolList.map(async (rawSymbol) => {
        let code = rawSymbol.trim();
        // 점(.) 뒤에 있는 .KS, .KQ 제거
        if (code.includes('.')) code = code.split('.')[0];

        try {
            // 네이버 주식 API 호출
            const url = `https://m.stock.naver.com/api/stock/${code}/basic`;
            const response = await fetch(url, { headers });
            
            if (!response.ok) throw new Error('Network Err');
            
            const data = await response.json();
            
            // 데이터 파싱
            const price = parseInt(data.closePrice.replace(/,/g, '')); 
            const prevPrice = parseInt(data.prevClosePrice.replace(/,/g, ''));
            const change = price - prevPrice;
            const percent = (change / prevPrice) * 100;

            results.push({
                symbol: rawSymbol,
                name: data.stockName,
                price: price,
                change: change,
                percent: percent,
                valid: true
            });
        } catch (error) {
            console.error(`Error fetching ${rawSymbol}:`, error);
            // ⚠️ 에러가 나도 "에러 났다"는 데이터를 넣어줌 (그래야 화면에서 삭제 가능)
            results.push({
                symbol: rawSymbol,
                name: "조회 실패",
                price: 0,
                change: 0,
                percent: 0,
                valid: false // 실패 표시
            });
        }
    }));

    res.status(200).json(results);
}

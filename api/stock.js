export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate'); 
    const { symbols } = req.query;

    if (!symbols) return res.json([]);

    const symbolList = symbols.split(',');
    const results = [];

    // 🛡️ 핵심: 네이버 모바일 웹사이트인 척 위장하는 헤더
    const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.stock.naver.com/',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    await Promise.all(symbolList.map(async (rawSymbol) => {
        let code = rawSymbol.trim();
        if (code.includes('.')) code = code.split('.')[0]; // .KS 떼기

        try {
            // 네이버 모바일 API
            const url = `https://m.stock.naver.com/api/stock/${code}/basic`;
            
            // 타임아웃 3초 설정 (너무 오래 걸리면 포기)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, { headers, signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) throw new Error('Blocked or Error');
            
            const data = await response.json();
            
            // 가격 정보 파싱
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
            console.error(`Fetch failed for ${code}:`, error);
            // 에러 나도 valid: false로 데이터 반환 (화면에서 삭제 가능하게)
            results.push({
                symbol: rawSymbol,
                name: "조회 불가",
                price: 0,
                change: 0,
                percent: 0,
                valid: false
            });
        }
    }));

    res.status(200).json(results);
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate'); // 10초 캐싱
    const { symbols } = req.query;

    if (!symbols) return res.json([]);

    // 요청받은 종목 코드들 (예: 005930.KS, 086520.KQ, TSLA)
    const symbolList = symbols.split(',');
    const results = [];

    try {
        // 모든 종목을 하나씩 순서대로 네이버에 물어봅니다.
        for (const rawSymbol of symbolList) {
            let code = rawSymbol.trim();
            let isDomestic = true;
            
            // 1. 한국 주식 (.KS, .KQ) 정리
            if (code.endsWith('.KS') || code.endsWith('.KQ')) {
                code = code.split('.')[0]; // 점 뒤에 떼버리기 (005930.KS -> 005930)
            } else {
                // 점이 없으면 미국 주식으로 간주 (간단한 처리)
                isDomestic = false;
            }

            let url = '';
            // 2. 네이버 비공개 API 주소 결정
            if (isDomestic) {
                // 국내 주식 API
                url = `https://m.stock.naver.com/api/stock/${code}/basic`;
            } else {
                // 해외 주식 API (TSLA -> NAS/TSLA 같은 변환이 필요하지만, 일단 야후 백업이나 간단한 처리)
                // *해외 주식은 복잡해서 일단 국내 위주로 처리하고 에러 방지*
                results.push({
                    symbol: rawSymbol,
                    name: "해외주식 준비중",
                    price: 0, change: 0, percent: 0
                });
                continue; 
            }

            // 3. 데이터 가져오기
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network Err');
            
            const data = await response.json();
            
            // 4. 데이터 정리 (국내 주식 기준)
            // 네이버는 가격을 "73,000" 처럼 쉼표 넣어서 문자열로 줌 -> 숫자로 변환 필요
            const price = parseInt(data.closePrice.replace(/,/g, '')); 
            const prevPrice = parseInt(data.prevClosePrice.replace(/,/g, ''));
            const change = price - prevPrice;
            const percent = (change / prevPrice) * 100;

            results.push({
                symbol: rawSymbol, // 원래 요청했던 코드 유지
                name: data.stockName,
                price: price,
                change: change,
                percent: percent
            });
        }

        res.status(200).json(results);

    } catch (error) {
        console.error("Naver API Error:", error);
        // 에러 나면 빈 배열 반환해서 화면 안 깨지게 함
        res.status(200).json([]);
    }
}

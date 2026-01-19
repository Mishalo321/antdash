// api/indices.js

export default async function handler(req, res) {
    // 1. 캐싱 설정 (1분마다 갱신) - 너무 자주 부르면 야후가 차단할 수 있음
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    // 2. 야후 파이낸스에서 가져올 지수들의 코드 (심볼)
    // ^KS11: 코스피, ^KQ11: 코스닥, NQ=F: 나스닥 선물, KRW=X: 원달러 환율
    const symbols = ['^KS11', '^KQ11', 'NQ=F', 'KRW=X'];
    
    try {
        // 3. 4개 지수를 한번에 요청 (Promise.all 사용)
        const requests = symbols.map(symbol => 
            fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)
            .then(res => res.json())
        );

        const responses = await Promise.all(requests);

        // 4. 데이터 보기 좋게 정리
        const results = responses.map((data, index) => {
            const meta = data.chart.result[0].meta;
            const price = meta.regularMarketPrice;      // 현재가
            const prevClose = meta.chartPreviousClose;  // 전일 종가 (등락 계산용)
            const change = price - prevClose;           // 등락폭
            const percent = (change / prevClose) * 100; // 등락률

            return {
                symbol: symbols[index],
                price: price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}),
                change: change,
                percent: percent.toFixed(2),
                isUp: change > 0 // 상승 여부 (빨강/파랑 색깔 결정용)
            };
        });

        // 5. 결과 반환 { kospi: {...}, kosdaq: {...}, ... }
        res.status(200).json({
            kospi: results[0],
            kosdaq: results[1],
            nasdaq: results[2],
            exchange: results[3]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '데이터를 가져오지 못했습니다.' });
    }
}

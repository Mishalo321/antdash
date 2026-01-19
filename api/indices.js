export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    try {
        // 네이버 지수 API 주소들
        const urls = [
            'https://m.stock.naver.com/api/index/KOSPI/basic',   // 코스피
            'https://m.stock.naver.com/api/index/KOSDAQ/basic',  // 코스닥
            'https://api.stock.naver.com/index/.IXIC/basic',     // 나스닥 (종합)
            'https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW' // 환율
        ];

        // 4개 동시에 요청
        const responses = await Promise.all(urls.map(url => fetch(url).then(r => r.json())));

        // 데이터 정리
        const parseIndex = (data) => {
            // data가 배열이면(환율) 첫번째꺼, 아니면 그냥 객체
            const info = Array.isArray(data) ? data[0] : data; 
            const price = parseFloat(info.closePrice.replace(/,/g, ''));
            const change = parseFloat(info.compareToPreviousClosePrice.replace(/,/g, ''));
            // 하락이면 change가 양수로 들어와도 부호를 맞춰줘야 함 (네이버 데이터 특성상 계산 필요)
            // compareToPreviousClosePrice는 절대값이므로, 등락률(fluctuationsRatio) 부호를 따라감
            const percent = parseFloat(info.fluctuationsRatio);
            const isUp = percent > 0;
            
            return {
                price: price.toLocaleString(undefined, {maximumFractionDigits: 2}),
                percent: percent.toFixed(2),
                isUp: isUp
            };
        };

        res.status(200).json({
            kospi: parseIndex(responses[0]),
            kosdaq: parseIndex(responses[1]),
            nasdaq: parseIndex(responses[2]),
            exchange: parseIndex(responses[3].result) // 환율은 구조가 조금 다름
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed' });
    }
}
